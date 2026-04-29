"""Trigger action: ban user."""

import logging
from datetime import datetime, timedelta, timezone

from aiogram.exceptions import TelegramAPIError

from backend.services.telegram_client import RateLimitedBot
logger = logging.getLogger(__name__)


async def ban_action(bot: RateLimitedBot, chat_id: int, user_id: int, data: dict) -> bool:
    """Ban user permanently or temporarily."""
    minutes = data.get("duration_minutes", 0)
    try:
        kwargs = {"chat_id": chat_id, "user_id": user_id}
        if minutes > 0:
            kwargs["until_date"] = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        await bot.ban_chat_member(**kwargs)
        return True
    except TelegramAPIError as exc:
        logger.warning("Failed to ban user %s: %s", user_id, exc)
    return False