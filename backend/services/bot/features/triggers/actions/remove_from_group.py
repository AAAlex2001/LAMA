"""Trigger action: remove user from group."""

import logging

from aiogram.exceptions import TelegramAPIError

from backend.services.telegram_client import RateLimitedBot
logger = logging.getLogger(__name__)


async def remove_from_group_action(bot: RateLimitedBot, chat_id: int, user_id: int, data: dict) -> bool:
    """Kick semantics in Telegram Bot API: unbanChatMember with only_if_banned=False."""
    try:
        await bot.unban_chat_member(chat_id=chat_id, user_id=user_id, only_if_banned=False)
        return True
    except TelegramAPIError as exc:
        logger.warning("Failed to remove user %s from chat %s: %s", user_id, chat_id, exc)
    return False