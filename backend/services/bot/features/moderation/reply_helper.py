"""Безопасная отправка ответа в чат (с глушением rate-limit)."""

import logging

from backend.services.rate_limiter import RateLimitTimeout
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)


async def reply_to_chat(bot: RateLimitedBot, chat_id: int, text: str) -> None:
    """send_message; rate-limit гасим (это просто feedback, не критично)."""
    try:
        await bot.send_message(chat_id=chat_id, text=text)
    except RateLimitTimeout:
        logger.warning("Rate limit hit sending reply to chat %s", chat_id)
