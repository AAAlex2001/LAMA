"""Вспомогательные функции после публикации: сохранение, бэкапы, уведомления, статус."""

from datetime import datetime, timezone
from typing import Any, List, Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    Publication, PublicationNotification, TelegramMessage,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
    ContentType as DBContentType,
)
from backend.models.channels import ChannelGroup as Channel, BackupMode
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
        if mapped and mapped in content_types:
            return True
        return False

    if "text_posts" in post_types and not has_media:
        return True

    return False


def make_notification_callback(db: AsyncSession):
    async def callback(publication_id: int, status: str, message: str, error_details=None):
        notification = PublicationNotification(
            publication_id=publication_id, status=status,
            message=message, error_details=error_details,
        )
        db.add(notification)
        await db.flush()

    return callback


async def save_telegram_messages(results: List[ChannelPublishResult], db: AsyncSession) -> None:
    objects = []
    for result in results:
        if result.success and result.telegram_messages_data:
            for msg_data in result.telegram_messages_data:
                objects.append(TelegramMessage(
                    publication_id=msg_data["publication_id"],
                    channel_id=msg_data["channel_id"],
                    telegram_message_id=msg_data["telegram_message_id"],
                ))
    if objects:
        db.add_all(objects)


async def handle_backups(
    results: List[ChannelPublishResult],
    publication: Publication,
    db: AsyncSession,
    create_notification_callback,
) -> None:
    for result in results:
        if result.success and result.sent_messages and result.channel_obj:
            try:
                await handle_instant_backup(
                    result.channel_obj, result.sent_messages,
                    publication, db, create_notification_callback,
                )
            except Exception as e:
                logger.error("Failed to handle instant backup for %s: %s", result.channel, e)


async def handle_instant_backup(
    channel: Channel,
    messages: List[Any],
    publication: Publication,
    db: AsyncSession,
    create_notification_callback,
) -> None:
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
                    channel.id, publication.id, publication.content_type,
                    channel.backup_post_types,
                )
    except Exception as error:
        await create_notification_callback(
            publication.id, "error",
            f"Instant backup failed for {getattr(channel, 'title', channel.telegram_id)}",
            {"error": str(error)},
        )


async def create_notifications(
    results: List[ChannelPublishResult],
    publication_id: int,
    create_notification_callback,
) -> None:
    for result in results:
        if result.success:
            await create_notification_callback(publication_id, "success", f"Published to {result.channel}")
        elif result.notification_error:
            await create_notification_callback(publication_id, "error", result.notification_error)


def update_publication_status(
    publication: Publication,
    success_count: int,
    total_count: int,
    calculate_next_repeat_time_callback,
) -> None:
    if success_count == 0:
        publication.status = DBPublicationStatus.FAILED
        return

    publication.published_time = datetime.now(timezone.utc)
    publication.status = (
        DBPublicationStatus.PUBLISHED if success_count == total_count
        else DBPublicationStatus.PARTIAL_SUCCESS
    )

    if publication.repeat_interval and publication.repeat_interval != DBRepeatInterval.NEVER:
        base_time = publication.scheduled_time or publication.published_time
        publication.next_repeat_time = compute_next_repeat(publication, base_time, calculate_next_repeat_time_callback)


def compute_next_repeat(publication: Publication, base_time: datetime, calculate_fn) -> Optional[datetime]:
    return calculate_fn(
        base_time,
        publication.repeat_interval,
        publication.repeat_custom_days,
        publication.repeat_custom_hours,
        publication.repeat_end_time,
        publication.repeat_custom_unit,
        publication.repeat_custom_value,
        publication.repeat_weekdays,
        publication.repeat_month_days,
        publication.repeat_year_month,
        publication.repeat_year_days,
    )
