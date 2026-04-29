"""Главный оркестратор публикации: батчевая отправка во все каналы + post-publish."""

import asyncio
import logging
import time
from typing import Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication, TelegramMessage
from backend.schemas.publications.publishing import ChannelPublishResult, PublishResult
from backend.services.publications.features.publishing.create_notifications import create_notifications
from backend.services.publications.features.publishing.finalize_publication import update_publication_status
from backend.services.publications.features.publishing.handle_backups import handle_backups
from backend.services.publications.features.publishing.process_batch import process_batch
from backend.services.publications.features.publishing.save_telegram_messages import save_telegram_messages

logger = logging.getLogger(__name__)

BATCH_SIZE = 10
INTER_BATCH_PAUSE_SECONDS = 0.3


class PublishToChannels:
    """Шлёт публикацию по всем её каналам и оформляет post-publish."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        publication: Publication,
        get_bot_callback,
        create_notification_callback,
        calculate_next_repeat_time_callback,
    ) -> PublishResult:
        publish_start = time.monotonic()
        logger.info("publish_now START publication_id=%s", publication.id)

        reply_map = await fetch_reply_map(self.db, publication)
        results = await send_in_batches(publication, get_bot_callback, reply_map)

        await save_telegram_messages(results, self.db)
        await handle_backups(results, publication, self.db, create_notification_callback)
        await create_notifications(results, publication.id, create_notification_callback)

        success_count = sum(1 for r in results if r.success)
        update_publication_status(
            publication, success_count, len(results), calculate_next_repeat_time_callback,
        )

        self.db.add(publication)
        await self.db.flush()
        await self.db.refresh(publication)

        logger.info(
            "publish_now DONE publication_id=%s, total=%.3fs, success=%s/%s",
            publication.id, time.monotonic() - publish_start, success_count, len(results),
        )

        return PublishResult(
            success=success_count > 0,
            results=results,
            success_count=success_count,
            total_count=len(results),
            publication_id=publication.id,
        )


async def fetch_reply_map(db: AsyncSession, publication: Publication) -> Dict[int, int]:
    """{channel_id: telegram_message_id} для reply_to_post_id; пусто если reply нет."""
    if not publication.reply_to_post_id:
        return {}
    rows = (await db.execute(
        select(TelegramMessage.channel_id, TelegramMessage.telegram_message_id)
        .where(TelegramMessage.publication_id == publication.reply_to_post_id)
    )).all()
    return dict(rows)


async def send_in_batches(
    publication: Publication,
    get_bot_callback,
    reply_map: Dict[int, int],
) -> List[ChannelPublishResult]:
    """Шлёт каналы батчами по BATCH_SIZE с паузой между батчами."""
    results: List[ChannelPublishResult] = []
    channels = publication.channels

    for batch_start in range(0, len(channels), BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, len(channels))
        batch = channels[batch_start:batch_end]
        batch_num = batch_start // BATCH_SIZE + 1

        batch_results = await process_batch(
            publication, batch, batch_num, get_bot_callback, reply_map,
        )
        results.extend(batch_results)

        if batch_end < len(channels):
            await asyncio.sleep(INTER_BATCH_PAUSE_SECONDS)
    return results
