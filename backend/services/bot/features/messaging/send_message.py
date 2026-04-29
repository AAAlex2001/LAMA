"""Отправка сообщения от лица бота + сохранение в BotMessage."""

from typing import List, Optional, Union

from aiogram.exceptions import TelegramAPIError
from aiogram.types import Message
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotStatus, MessageType
from backend.schemas.bots.messages import SendMessageRequest
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.messaging.dispatch_telegram import dispatch_telegram
from backend.services.bot.features.messaging.save_message import SaveBotMessage
from backend.services.bot_provider import resolve_for_bot_id
from backend.utils.keyboard import build_keyboard


class SendBotMessage:
    """Шлёт через TG, сохраняет копию в BotMessage."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, bot_id: int, data: SendMessageRequest, owner_id: Optional[int] = None,
    ) -> Union[Message, List[Message]]:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)
        if bot.status != BotStatus.ACTIVE:
            raise HTTPException(status_code=400, detail="Bot is not active")

        telegram_bot = await resolve_for_bot_id(self.db, bot_id)
        reply_markup = build_keyboard(data.buttons) if data.buttons else None

        try:
            result = await dispatch_telegram(telegram_bot, data, reply_markup)
        except TelegramAPIError as exc:
            raise HTTPException(status_code=400, detail=f"Failed to send message: {exc}")

        await persist_responses(self.db, bot.id, data, result)
        return result


async def persist_responses(
    db: AsyncSession,
    bot_id: int,
    data: SendMessageRequest,
    result: Union[Message, List[Message]],
) -> None:
    """Сохраняет каждое полученное от TG сообщение в BotMessage."""
    messages = result if isinstance(result, list) else [result]
    saver = SaveBotMessage(db)

    for msg in messages:
        file_id = msg.photo[-1].file_id if msg.photo else None
        await saver.execute(
            bot_id=bot_id,
            telegram_message_id=msg.message_id,
            chat_id=data.chat_id,
            user_id=None,
            message_type=data.media_type or MessageType.TEXT,
            text_content=msg.text or msg.caption or data.text_content,
            media_file_id=file_id,
            media_url=data.media_url,
            is_incoming=False,
            raw_data=msg.model_dump(mode="json"),
            reply_to_message_id=data.reply_to_message_id,
        )
