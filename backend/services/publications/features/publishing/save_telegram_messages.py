"""Запись TelegramMessage по результатам публикации."""

from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import TelegramMessage
from backend.schemas.publications.publishing import ChannelPublishResult


async def save_telegram_messages(
    results: List[ChannelPublishResult], db: AsyncSession,
) -> None:
    """Из успешных результатов добавляет в БД записи TelegramMessage."""
    objects = []
    for result in results:
        if result.success and result.telegram_messages_data:
            for data in result.telegram_messages_data:
                objects.append(TelegramMessage(
                    publication_id=data["publication_id"],
                    channel_id=data["channel_id"],
                    telegram_message_id=data["telegram_message_id"],
                ))
    if objects:
        db.add_all(objects)
