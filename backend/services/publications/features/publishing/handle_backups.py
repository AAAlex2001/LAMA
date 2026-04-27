"""Instant-backup опубликованных постов и их ретрансляция в backup_target_ids."""

import logging
from typing import Any, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackupMode, ChannelGroup as Channel
from backend.models.publications import ContentType as DBContentType, Publication
from backend.schemas.publications import ChannelPublishResult
from backend.services.channel.features.backup import SavePostToBackup
from backend.services.channel.features.retransmit.retransmit_post import RetransmitPost

logger = logging.getLogger(__name__)

MEDIA_CONTENT_TYPES = {
    DBContentType.TEXT_WITH_MEDIA,
    DBContentType.IMAGE,
    DBContentType.VIDEO,
    DBContentType.AUDIO,
    DBContentType.DOCUMENT,
}

CONTENT_TYPE_MAP = {
    DBContentType.IMAGE: "photo",
    DBContentType.VIDEO: "video",
    DBContentType.AUDIO: "document",
    DBContentType.DOCUMENT: "document",
}


def should_retransmit(publication: Publication, channel: Channel) -> bool:
    """Решает по правилам backup_post_types канала, надо ли ретранслировать."""
    post_types = channel.backup_post_types
    if not post_types:
        return True

    has_buttons = bool(publication.inline_keyboard)
    has_media = publication.content_type in MEDIA_CONTENT_TYPES

    if "with_buttons" in post_types and has_buttons:
        return True

    if "with_attachments" in post_types and has_media:
        content_types = channel.backup_content_types
        if not content_types:
            return True
        if publication.content_type == DBContentType.TEXT_WITH_MEDIA:
            return any(ct in content_types for ct in ("photo", "video", "animation", "document"))
        mapped = CONTENT_TYPE_MAP.get(publication.content_type)
        return bool(mapped and mapped in content_types)

    if "text_posts" in post_types and not has_media:
        return True

    return False


async def handle_backups(
    results: List[ChannelPublishResult],
    publication: Publication,
    db: AsyncSession,
    create_notification_callback,
) -> None:
    """По всем успешным результатам делает instant-backup; ошибки одного канала не валят остальные."""
    for result in results:
        if result.success and result.sent_messages and result.channel_obj:
            try:
                await handle_instant_backup(
                    result.channel_obj, result.sent_messages,
                    publication, db, create_notification_callback,
                )
            except Exception as exc:
                logger.error("Failed to handle instant backup for %s: %s", result.channel, exc)


async def handle_instant_backup(
    channel: Channel,
    messages: List[Any],
    publication: Publication,
    db: AsyncSession,
    create_notification_callback,
) -> None:
    """SavePostToBackup для каждого TG-сообщения; для INSTANT — ретрансляция в targets."""
    if channel.backup_mode == BackupMode.DISABLED:
        return

    target_ids = channel.backup_target_ids or (
        [channel.backup_target_id] if channel.backup_target_id else []
    )

    try:
        saved_post = None
        for message in messages:
            saved_post = await SavePostToBackup(db).execute(channel.id, message)

        if saved_post and channel.backup_mode == BackupMode.INSTANT and target_ids:
            if should_retransmit(publication, channel):
                for target_id in target_ids:
                    if target_id != channel.id:
                        await RetransmitPost(db).execute(saved_post, target_id)
            else:
                logger.info(
                    "retransmit_skipped: channel=%s, pub=%s, content_type=%s, post_types=%s",
                    channel.id, publication.id, publication.content_type, channel.backup_post_types,
                )
    except Exception as error:
        await create_notification_callback(
            publication.id,
            "error",
            f"Instant backup failed for {getattr(channel, 'title', channel.telegram_id)}",
            {"error": str(error)},
        )
