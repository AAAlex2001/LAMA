"""Точки входа для публикации и повторной публикации."""

from datetime import datetime, timezone
from typing import List, Dict
import asyncio
import time
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    Publication, TelegramMessage,
    RepeatInterval as DBRepeatInterval,
)
from backend.schemas.publications import PublishResult, ChannelPublishResult
from backend.services.channel import ChannelService
from backend.services.channel.backup_service import BackupService
from backend.services.channel.retransmit_service import RetransmitService
from backend.services.publications.channel_sender import process_batch, send_to_channel_with_retry
from backend.services.publications.publish_helpers import (
    save_telegram_messages,
    handle_backups,
    create_notifications,
    update_publication_status,
    compute_next_repeat,
)

logger = logging.getLogger(__name__)

BATCH_SIZE = 10


async def publish_to_channels(
    publication: Publication,
    db: AsyncSession,
    channel_service: ChannelService,
    get_bot_callback,
    create_notification_callback,
    calculate_next_repeat_time_callback,
) -> PublishResult:
    """Опубликовать во все каналы публикации батчами."""
    publish_start = time.monotonic()
    logger.info("publish_now START publication_id=%s", publication.id)

    reply_map: Dict[int, int] = {}
    if publication.reply_to_post_id:
        result = await db.execute(
            select(TelegramMessage.channel_id, TelegramMessage.telegram_message_id)
            .where(TelegramMessage.publication_id == publication.reply_to_post_id)
        )
        reply_map = dict(result.all())

    results: List[ChannelPublishResult] = []

    for batch_start in range(0, len(publication.channels), BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, len(publication.channels))
        batch_channels = publication.channels[batch_start:batch_end]
        batch_num = batch_start // BATCH_SIZE + 1

        batch_results = await process_batch(publication, batch_channels, batch_num, get_bot_callback, reply_map)
        results.extend(batch_results)

        if batch_end < len(publication.channels):
            await asyncio.sleep(0.3)

    await save_telegram_messages(results, db)
    backup_service = BackupService(db)
    retransmit_service = RetransmitService(db)
    await handle_backups(results, publication, backup_service, retransmit_service, create_notification_callback)
    await create_notifications(results, publication.id, create_notification_callback)

    success_count = sum(1 for r in results if r.success)
    total_count = len(results)

    update_publication_status(publication, success_count, total_count, calculate_next_repeat_time_callback)

    db.add(publication)
    await db.flush()
    await db.refresh(publication)

    logger.info(
        "publish_now DONE publication_id=%s, total=%.3fs, success=%s/%s",
        publication.id, time.monotonic() - publish_start, success_count, total_count,
    )

    return PublishResult(
        success=success_count > 0, results=results,
        success_count=success_count, total_count=total_count, publication_id=publication.id,
    )


async def republish(
    publication: Publication,
    db: AsyncSession,
    get_bot_callback,
    calculate_next_repeat_time_callback,
) -> PublishResult:
    """Повторно опубликовать пост для повторяющихся публикаций."""
    if publication.repeat_interval == DBRepeatInterval.NEVER:
        return PublishResult(success=False, error="Publication is not set to repeat", results=[], success_count=0, total_count=0)

    results: List[ChannelPublishResult] = []

    for channel in publication.channels:
        channel_name = getattr(channel, "title", getattr(channel, "name", str(channel.telegram_id)))
        try:
            bot = await get_bot_callback(channel)
        except ValueError as e:
            results.append(ChannelPublishResult(channel=channel_name, success=False, error=str(e)))
            continue

        result = await send_to_channel_with_retry(publication, channel, bot, channel_name)
        results.append(result)

    tg_messages = []
    for result in results:
        if result.success:
            for msg_id in result.message_ids:
                tg_messages.append(TelegramMessage(
                    publication_id=publication.id, channel_id=result.channel_obj.id if result.channel_obj else 0,
                    telegram_message_id=msg_id,
                ))
    if tg_messages:
        db.add_all(tg_messages)

    success_count = sum(1 for r in results if r.success)

    if success_count > 0:
        publication.published_time = datetime.now(timezone.utc)
        base_time = publication.next_repeat_time or publication.published_time
        publication.next_repeat_time = compute_next_repeat(publication, base_time, calculate_next_repeat_time_callback)

    await db.flush()

    return PublishResult(
        success=success_count > 0, results=results,
        success_count=success_count, total_count=len(results), publication_id=publication.id,
    )
