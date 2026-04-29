"""Сохранение исходящего сообщения бота в BotMessage."""

from typing import Optional

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotMessage, MessageType
from backend.services.direct.features.utils.media_detectors import (
    extract_media_file_id,
    extract_media_type,
)


class SaveOutgoingMessage:
    """Создаёт запись BotMessage(is_incoming=False) на основе TG-ответа."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        tg_chat_id: int,
        tg_message: Message,
        fallback_type: MessageType,
        fallback_media_url: Optional[str],
        reply_to_message_id: Optional[int] = None,
    ) -> BotMessage:
        message_type = extract_media_type(tg_message, fallback_type)
        msg = BotMessage(
            bot_id=bot_id,
            telegram_message_id=tg_message.message_id,
            chat_id=tg_chat_id,
            user_id=None,
            message_type=message_type,
            text_content=tg_message.text or tg_message.caption,
            media_file_id=extract_media_file_id(tg_message, message_type),
            media_url=fallback_media_url,
            is_incoming=False,
            raw_data=tg_message.model_dump(),
            reply_to_message_id=reply_to_message_id,
        )
        self.db.add(msg)
        return msg
