"""Низкоуровневая отправка welcome: медиа из MEDIA_SEND_METHODS либо просто текст."""

from typing import Optional

from aiogram.types import Message

from backend.models.bots import MessageType
from backend.services.telegram_client import RateLimitedBot

MEDIA_SEND_METHODS = {
    MessageType.PHOTO: "send_photo",
    MessageType.VIDEO: "send_video",
    MessageType.DOCUMENT: "send_document",
    MessageType.ANIMATION: "send_animation",
}


async def send_to_telegram(
    telegram_bot: RateLimitedBot,
    chat_id: int,
    text: str,
    media_url: Optional[str],
    media_type: Optional[MessageType],
    reply_markup,
    message_thread_id: Optional[int],
) -> Message:
    """Если media_url+media_type из MEDIA_SEND_METHODS — медиа; иначе обычный текст."""
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
