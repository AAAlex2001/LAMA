"""Отправка welcome-сообщения с готовым контекстом для шорткодов."""

import logging
from typing import Any, Dict, Optional

from aiogram.exceptions import TelegramAPIError
from aiogram.types import Message
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, MessageType
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.services.direct.features.messages.save_outgoing_message import SaveOutgoingMessage
from backend.services.telegram_client import RateLimitedBot
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)

MEDIA_SEND_METHODS = {
    MessageType.PHOTO: "send_photo",
    MessageType.VIDEO: "send_video",
    MessageType.DOCUMENT: "send_document",
    MessageType.ANIMATION: "send_animation",
}


class SendWelcome:
    """Рендерит шорткоды → отправляет в TG → сохраняет в DM-историю."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        telegram_bot: RateLimitedBot,
        bot_model: BotModel,
        user_id: int,
        chat_id: int,
        context: Optional[Dict[str, Any]] = None,
        message_thread_id: Optional[int] = None,
    ) -> Optional[Message]:
        """Бросает 404 если welcome выключен или текст пуст. None если TG вернул ошибку."""
        if not bot_model.welcome_enabled or not bot_model.welcome_message:
            raise HTTPException(status_code=404, detail="Bot not found")

        text = ShortcodeProcessor.process(bot_model.welcome_message, context)
        reply_markup = build_keyboard(bot_model.welcome_buttons)

        try:
            message = await send_to_telegram(
                telegram_bot, chat_id, text,
                media_url=bot_model.welcome_media_url,
                media_type=bot_model.welcome_media_type,
                reply_markup=reply_markup,
                message_thread_id=message_thread_id,
            )
        except TelegramAPIError as exc:
            logger.warning("Failed to send welcome to user %s: %s", user_id, exc)
            return None

        logger.info("Welcome message sent to user %s in chat %s", user_id, chat_id)
        await persist_outgoing_in_dm(self.db, bot_model, chat_id, message)
        return message


async def send_to_telegram(
    telegram_bot: RateLimitedBot,
    chat_id: int,
    text: str,
    media_url: Optional[str],
    media_type: Optional[MessageType],
    reply_markup,
    message_thread_id: Optional[int],
) -> Message:
    """Send welcome text or media message to Telegram."""
    if media_url and media_type and media_type in MEDIA_SEND_METHODS:
        method = getattr(telegram_bot, MEDIA_SEND_METHODS[media_type])
        return await method(
            chat_id=chat_id,
            **{media_type.value.lower(): media_url},
            caption=text,
            reply_markup=reply_markup,
            message_thread_id=message_thread_id,
        )
    return await telegram_bot.send_message(
        chat_id=chat_id,
        text=text,
        reply_markup=reply_markup,
        message_thread_id=message_thread_id,
    )


async def persist_outgoing_in_dm(
    db: AsyncSession,
    bot_model: BotModel,
    chat_id: int,
    message: Optional[Message],
) -> None:
    """Persist welcome outgoing message only for direct chats."""
    if not message or chat_id <= 0:
        return
    await SaveOutgoingMessage(db).execute(
        bot_id=bot_model.id,
        tg_chat_id=chat_id,
        tg_message=message,
        fallback_type=bot_model.welcome_media_type or MessageType.TEXT,
        fallback_media_url=bot_model.welcome_media_url,
    )
    await db.flush()
