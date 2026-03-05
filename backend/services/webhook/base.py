"""
Р‘Р°Р·РѕРІС‹Рµ СѓС‚РёР»РёС‚С‹ РґР»СЏ webhook СЃРµСЂРІРёСЃРѕРІ
"""
import os
import asyncio
import logging
from typing import Optional, Dict
from contextlib import asynccontextmanager

from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from backend.models.bots import Bot as BotModel
from backend.models.channels import ChannelGroup
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)

# Constants
TELEGRAM_API_TIMEOUT = 5.0
DB_QUERY_TIMEOUT = 3.0

# Global cache for aiogram bots
_bots_cache: Dict[str, RateLimitedBot] = {}

@asynccontextmanager
async def get_bot_session(token: str):
    """
    Context manager for safely working with Telegram Bot with automatic rate limiting.
    Cached by token.
    """
    global _bots_cache
    if token not in _bots_cache:
        bot = Bot(token=token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        _bots_cache[token] = RateLimitedBot(bot)
    
    yield _bots_cache[token]

async def get_bot_by_token(db: AsyncSession, token: str) -> Optional[BotModel]:
    query = select(BotModel).where(BotModel.token == token).limit(1)
    result = await db.execute(query)
    return result.scalar_one_or_none()

async def get_master_bot_model(db: AsyncSession) -> Optional[BotModel]:
    master_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not master_token:
        return None
    query = select(BotModel).where(BotModel.token == master_token).limit(1)
    result = await db.execute(query)
    return result.scalar_one_or_none()

async def get_bot_by_chat_id(db: AsyncSession, chat_id: int) -> Optional[BotModel]:
    query = (
        select(ChannelGroup)
        .where(ChannelGroup.telegram_id == chat_id)
        .options(joinedload(ChannelGroup.bot))
    )
    result = await db.execute(query)
    channel = result.unique().scalar_one_or_none()
    if channel and channel.bot:
        return channel.bot
    return await get_master_bot_model(db)
