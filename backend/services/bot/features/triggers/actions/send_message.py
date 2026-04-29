"""Trigger action: send text message."""

import logging

from aiogram.exceptions import TelegramAPIError, TelegramRetryAfter
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import MessageType
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.services.bot.features.triggers.save_trigger_message import save_trigger_message
from backend.services.bot.features.triggers.shortcode_context import build_shortcode_ctx
from backend.services.bot_provider import get_bot_info
from backend.services.telegram_client import RateLimitedBot
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)


async def send_message_action(db: AsyncSession, bot: RateLimitedBot, chat_id: int, user_id: int, data: dict) -> bool:
    """Send text, render shortcodes, persist outgoing message in DM."""
    text = data.get("text", "")
    if not text:
        return False
    bot_info = await get_bot_info(bot.bot.token)
    text = ShortcodeProcessor.process(text, build_shortcode_ctx(user_id, data, bot_info))
    try:
        tg_message = await bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_markup=build_keyboard(data.get("buttons")),
            _group_weight=0,
        )
        await save_trigger_message(db, data, chat_id, tg_message, MessageType.TEXT, None)
        return True
    except TelegramRetryAfter as exc:
        logger.warning("Trigger rate limited for chat %s: %ss", chat_id, exc.retry_after)
    except TelegramAPIError as exc:
        logger.warning("Failed to send trigger message to %s: %s", chat_id, exc)
    return False