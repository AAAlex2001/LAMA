"""
Базовые утилиты для webhook сервисов
"""
import os
import asyncio
import logging
from typing import Optional
from contextlib import asynccontextmanager

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import get_bot
from backend.models.bots import Bot as BotModel
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)

# Константы для производительности
TELEGRAM_API_TIMEOUT = 5.0
DB_QUERY_TIMEOUT = 3.0


@asynccontextmanager
async def get_bot_session():
    """Context manager для безопасной работы с Telegram Bot с автоматическим rate limiting"""
    bot = get_bot()
    rate_limited_bot = RateLimitedBot(bot)
    try:
        yield rate_limited_bot
    finally:
        try:
            await asyncio.wait_for(bot.session.close(), timeout=1.0)
        except asyncio.TimeoutError:
            logger.warning("Bot session close timeout")
        except Exception as e:
            logger.error(f"Error closing bot session: {e}")


async def get_master_bot_model(db: AsyncSession) -> Optional[BotModel]:
    """Получить мастер-бота из БД"""
    master_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not master_token:
        return None

    query = select(BotModel).where(BotModel.token == master_token)
    result = await db.execute(query)
    return result.scalar_one_or_none()

