"""Удаление опубликованных TG-сообщений из всех каналов."""

from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication, PublicationStatus as DBPublicationStatus
from backend.schemas.publications.publishing import ChannelPublishResult, DeleteMessageResult
from backend.services.publications.features.publishing.edit_telegram_message import (
    channel_display_name,
)


class DeleteTelegramMessages:
    """Удаляет каждое TelegramMessage; если все удалены — Publication.status=DELETED."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, publication: Publication, get_bot_callback,
    ) -> DeleteMessageResult:
        results = await delete_each_message(publication, get_bot_callback)

        success_count = sum(1 for r in results if r.success)
        if success_count == len(results):
            publication.status = DBPublicationStatus.DELETED

        await self.db.flush()

        return DeleteMessageResult(
            success=success_count > 0,
            results=results,
            success_count=success_count,
            total_count=len(results),
        )


async def delete_each_message(
    publication: Publication, get_bot_callback,
) -> List[ChannelPublishResult]:
    """Последовательно удаляет все TG-сообщения публикации."""
    results: List[ChannelPublishResult] = []
    for tg_msg in publication.telegram_messages:
        result = await delete_one_message(tg_msg, get_bot_callback)
        results.append(result)
    return results


async def delete_one_message(tg_msg, get_bot_callback) -> ChannelPublishResult:
    """Удалить одно TG-сообщение; ошибка → FAILED-результат."""
    channel_label = channel_display_name(tg_msg.channel)
    try:
        bot = await get_bot_callback(tg_msg.channel)
        await bot.delete_message(
            chat_id=tg_msg.channel.telegram_id,
            message_id=tg_msg.telegram_message_id,
        )
        return ChannelPublishResult(channel=channel_label, success=True)
    except Exception as exc:
        return ChannelPublishResult(channel=channel_label, success=False, error=str(exc))
