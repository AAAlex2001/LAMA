"""Общие утилиты polling-модуля."""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

logger = logging.getLogger(__name__)

TELEGRAM_API_TIMEOUT = 5.0


@asynccontextmanager
async def bot_session(token: str):
    """Context manager для безопасной работы с Telegram Bot."""
    bot = Bot(token=token)
    try:
        yield bot
    finally:
        try:
            await asyncio.wait_for(bot.session.close(), timeout=1.0)
        except (asyncio.TimeoutError, Exception):
            pass


async def approve_join_request(chat_id: int, user_id: int) -> bool:
    """Одобрить заявку на вступление через master-бота."""
    master_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not master_token:
        logger.error("TELEGRAM_BOT_TOKEN not set, cannot approve join request")
        return False

    try:
        async with bot_session(master_token) as master_bot:
            await master_bot.approve_chat_join_request(chat_id=chat_id, user_id=user_id)
            logger.info(f"Approved join: user={user_id}, chat={chat_id}")
            return True
    except TelegramAPIError as e:
        logger.warning(f"Approve join failed: {e}")
        return False
