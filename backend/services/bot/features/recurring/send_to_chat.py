"""Отправка повторяющегося сообщения в один чат + лог в RecurringMessageLog."""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import RecurringMessage, RecurringMessageLog
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)

MEDIA_SEND_METHODS = {
    "PHOTO": "send_photo",
    "VIDEO": "send_video",
    "DOCUMENT": "send_document",
}


async def send_to_chat(
    db: AsyncSession,
    bot: RateLimitedBot,
    chat_id: int,
    msg: RecurringMessage,
    text: str,
    keyboard,
) -> None:
    """Отправляет сообщение и пишет лог; ошибки TG не пробрасываются (логируем + success=False)."""
    telegram_message_id, error = await try_send(bot, chat_id, msg, text, keyboard)

    db.add(RecurringMessageLog(
        recurring_message_id=msg.id,
        chat_id=chat_id,
        telegram_message_id=telegram_message_id,
        success=error is None,
        error_message=error,
    ))


async def try_send(
    bot: RateLimitedBot,
    chat_id: int,
    msg: RecurringMessage,
    text: str,
    keyboard,
) -> tuple[Optional[int], Optional[str]]:
    """(telegram_message_id, error_message); error=None при успехе."""
    try:
        result = await dispatch_send(bot, chat_id, msg, text, keyboard)
        return result.message_id, None
    except Exception as exc:
        logger.error("Ошибка отправки в чат %s: %s", chat_id, exc)
        return None, str(exc)


async def dispatch_send(
    bot: RateLimitedBot,
    chat_id: int,
    msg: RecurringMessage,
    text: str,
    keyboard,
):
    """Маршрут: медиа из MEDIA_SEND_METHODS либо просто текст."""
    media_type = msg.media_type.value if msg.media_type else None
    if msg.media_url and media_type and media_type in MEDIA_SEND_METHODS:
        method = getattr(bot, MEDIA_SEND_METHODS[media_type])
        return await method(chat_id, msg.media_url, caption=text, reply_markup=keyboard)
    return await bot.send_message(chat_id, text or "", reply_markup=keyboard)
