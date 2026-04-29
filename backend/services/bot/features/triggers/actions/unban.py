"""Trigger action: unban user."""

import logging

from aiogram.exceptions import TelegramAPIError

from backend.services.telegram_client import RateLimitedBot
logger = logging.getLogger(__name__)


async def unban_action(bot: RateLimitedBot, chat_id: int, user_id: int, data: dict) -> bool:
    """Unban user only if currently banned."""
    try:
        await bot.unban_chat_member(chat_id=chat_id, user_id=user_id, only_if_banned=True)
        return True
    except TelegramAPIError as exc:
        logger.warning("Failed to unban user %s: %s", user_id, exc)
    return False