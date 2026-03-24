"""Базовые утилиты для webhook сервисов."""

import os
import logging
from typing import Optional

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from backend.models.bots import Bot as BotModel
from backend.models.channels import ChannelGroup

logger = logging.getLogger(__name__)

TELEGRAM_API_TIMEOUT = 5.0
DB_QUERY_TIMEOUT = 3.0


async def get_bot_by_token(db: AsyncSession, token: str) -> Optional[BotModel]:
    """Найти бота в БД по токену."""
    query = select(BotModel).where(BotModel.token == token).order_by(BotModel.id.asc()).limit(1)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_master_bot_model(db: AsyncSession) -> Optional[BotModel]:
    """Найти модель мастер-бота в БД."""
    master_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not master_token:
        return None
    query = select(BotModel).where(BotModel.token == master_token).limit(1)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_bot_context(db: AsyncSession, chat_id: Optional[int], token: Optional[str]) -> Optional[BotModel]:
    if chat_id:
        channel_query = (
            select(ChannelGroup)
            .where(or_(ChannelGroup.telegram_id == chat_id, ChannelGroup.linked_chat_id == chat_id))
            .options(joinedload(ChannelGroup.bot))
        )
        channel_res = await db.execute(channel_query)
        channel = channel_res.unique().scalars().first()

        if channel:
            if channel.bot and (not token or channel.bot.token == token):
                return channel.bot
            if channel.bot and token and channel.bot.token != token:
                return None

    if token:
        bot_query = select(BotModel).where(BotModel.token == token).order_by(BotModel.id.asc()).limit(1)
        bot_res = await db.execute(bot_query)
        return bot_res.scalar_one_or_none()

    return None

async def get_bot_by_chat_id(db: AsyncSession, chat_id: int) -> Optional[BotModel]:
    """Найти бота по telegram chat_id через привязку канала."""
    query = (
        select(ChannelGroup)
        .where(or_(ChannelGroup.telegram_id == chat_id, ChannelGroup.linked_chat_id == chat_id))
        .options(joinedload(ChannelGroup.bot))
    )
    result = await db.execute(query)
    channel = result.unique().scalars().first()
    if channel and channel.bot:
        return channel.bot
    return await get_master_bot_model(db)
