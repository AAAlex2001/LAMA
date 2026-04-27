"""Повторная публикация (для repeat_interval): шлёт без батчей, считает next_repeat_time."""

from datetime import datetime, timezone
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    Publication,
    RepeatInterval as DBRepeatInterval,
    TelegramMessage,
)
from backend.schemas.publications import ChannelPublishResult, PublishResult
from backend.services.publications.features.publishing.finalize_publication import compute_next_repeat
from backend.services.publications.features.publishing.process_batch import channel_display_name
from backend.services.publications.features.publishing.send_to_channel_with_retry import (
    send_to_channel_with_retry,
)


class Republish:
    """Повторная публикация: использует send_to_channel_with_retry, без backup'ов."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        publication: Publication,
        get_bot_callback,
        calculate_next_repeat_time_callback,
    ) -> PublishResult:
        if publication.repeat_interval == DBRepeatInterval.NEVER:
            return PublishResult(
                success=False, error="Publication is not set to repeat",
                results=[], success_count=0, total_count=0,
            )

        results = await send_all_channels(publication, get_bot_callback)

        persist_telegram_messages(self.db, publication, results)

        success_count = sum(1 for r in results if r.success)
        if success_count > 0:
            advance_repeat(publication, calculate_next_repeat_time_callback)

        await self.db.flush()

        return PublishResult(
            success=success_count > 0,
            results=results,
            success_count=success_count,
            total_count=len(results),
            publication_id=publication.id,
        )


async def send_all_channels(
    publication: Publication, get_bot_callback,
) -> List[ChannelPublishResult]:
    """Последовательно шлёт пост во все каналы публикации."""
    results: List[ChannelPublishResult] = []
    for channel in publication.channels:
        channel_name = channel_display_name(channel)
        try:
            bot = await get_bot_callback(channel)
        except ValueError as exc:
            results.append(ChannelPublishResult(
                channel=channel_name, success=False, error=str(exc),
            ))
            continue
        result = await send_to_channel_with_retry(publication, channel, bot, channel_name)
        results.append(result)
    return results


def persist_telegram_messages(
    db: AsyncSession,
    publication: Publication,
    results: List[ChannelPublishResult],
) -> None:
    """Записывает TelegramMessage для всех успешных отправок."""
    rows = []
    for result in results:
        if not result.success:
            continue
        channel_id = result.channel_obj.id if result.channel_obj else 0
        for msg_id in result.message_ids:
            rows.append(TelegramMessage(
                publication_id=publication.id,
                channel_id=channel_id,
                telegram_message_id=msg_id,
            ))
    if rows:
        db.add_all(rows)


def advance_repeat(
    publication: Publication, calculate_next_repeat_time_callback,
) -> None:
    """published_time = now; next_repeat_time от next_repeat_time или published_time."""
    publication.published_time = datetime.now(timezone.utc)
    base_time = publication.next_repeat_time or publication.published_time
    publication.next_repeat_time = compute_next_repeat(
        publication, base_time, calculate_next_repeat_time_callback,
    )
