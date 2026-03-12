"""Единый резолвер Telegram-ботов.

Переключает между мастер-ботом и пользовательскими ботами
через env-переменную USE_USER_BOTS.
"""

import os
import logging
from typing import Dict, Optional

from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from backend.models.bots import Bot as BotModel
from backend.models.channels import ChannelGroup
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)

cache: Dict[str, RateLimitedBot] = {}
bot_info_cache: Dict[str, User] = {}


def use_user_bots() -> bool:
    """Флаг режима: True — пользовательские боты, False — мастер-бот."""
    return os.getenv("USE_USER_BOTS", "false").lower() in ("1", "true", "yes")


def get_cached_bot(token: str) -> RateLimitedBot:
    """Получить или создать RateLimitedBot по токену с кешированием."""
    if token not in cache:
        bot = Bot(
            token=token,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML),
        )
        cache[token] = RateLimitedBot(bot)
    return cache[token]


def get_master_token() -> str:
    """Токен мастер-бота из env."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN is not set")
    return token


def resolve_master() -> RateLimitedBot:
    """Мастер-бот как RateLimitedBot."""
    return get_cached_bot(get_master_token())


def resolve_by_token(token: str) -> RateLimitedBot:
    """RateLimitedBot по произвольному токену."""
    return get_cached_bot(token)


async def get_bot_info(token: str) -> User:
    """Кешированный get_me() для токена."""
    if token not in bot_info_cache:
        bot = get_cached_bot(token)
        bot_info_cache[token] = await bot.bot.get_me()
    return bot_info_cache[token]


async def load_bot_model(
    db: AsyncSession,
    bot_id: int,
) -> Optional[BotModel]:
    """Загрузить модель бота по ID."""
    query = select(BotModel).where(BotModel.id == bot_id).limit(1)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def resolve_for_channel(
    db: AsyncSession,
    channel: ChannelGroup,
) -> RateLimitedBot:
    """Бот для конкретного канала."""
    if channel.bot_id:
        bot_model = await load_bot_model(db, channel.bot_id)
        if bot_model and bot_model.token:
            return get_cached_bot(bot_model.token)
            
    if use_user_bots():
        raise ValueError(
            f"Channel {channel.telegram_id} has no bot assigned"
        )
        
    return resolve_master()


async def resolve_for_bot_model(bot_model: BotModel) -> RateLimitedBot:
    """RateLimitedBot из модели бота.

    USE_USER_BOTS=true  → токен модели.
    USE_USER_BOTS=false → мастер-бот.
    """
    if use_user_bots():
        if not bot_model.token:
            raise ValueError(f"Bot {bot_model.id} has no token")
        return get_cached_bot(bot_model.token)
    return resolve_master()


async def resolve_for_bot_id(
    db: AsyncSession,
    bot_id: int,
) -> RateLimitedBot:
    """RateLimitedBot по ID бота в БД."""
    if use_user_bots():
        bot_model = await load_bot_model(db, bot_id)
        if not bot_model or not bot_model.token:
            raise ValueError(f"Bot {bot_id} not found or has no token")
        return get_cached_bot(bot_model.token)
    return resolve_master()


async def resolve_for_chat(
    db: AsyncSession,
    chat_id: int,
) -> RateLimitedBot:
    """Бот для telegram chat_id (ищет канал → его бот)."""
    if use_user_bots():
        query = (
            select(ChannelGroup)
            .where(ChannelGroup.telegram_id == chat_id)
            .options(joinedload(ChannelGroup.bot))
        )
        result = await db.execute(query)
        channel = result.unique().scalar_one_or_none()
        if not channel or not channel.bot or not channel.bot.token:
            raise ValueError(
                f"No bot found for chat_id {chat_id}"
            )
        return get_cached_bot(channel.bot.token)
    return resolve_master()
