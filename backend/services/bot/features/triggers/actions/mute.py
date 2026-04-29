"""Trigger action: mute user."""

import logging
from datetime import datetime, timedelta, timezone

from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatPermissions

from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)


async def mute_action(bot: RateLimitedBot, chat_id: int, user_id: int, data: dict) -> bool:
    """Restrict user from sending messages."""
    minutes = data.get("duration_minutes", 60)
    try:
        await bot.restrict_chat_member(
            chat_id=chat_id,
            user_id=user_id,
            permissions=ChatPermissions(can_send_messages=False),
            until_date=datetime.now(timezone.utc) + timedelta(minutes=minutes),
        )
        return True
    except TelegramAPIError as exc:
        logger.warning("Failed to mute user %s: %s", user_id, exc)
    return False