"""Поиск бота с проверкой владельца — общие хелперы."""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel


async def get_bot(
    db: AsyncSession, bot_id: int, owner_id: Optional[int] = None,
) -> Optional[BotModel]:
    """Бот по ID; если owner_id передан — с проверкой владельца. None если не найден."""
    query = select(BotModel).where(BotModel.id == bot_id)
    if owner_id is not None:
        query = query.where(BotModel.owner_id == owner_id)
    return (await db.execute(query)).scalar_one_or_none()


async def find_bot_or_404(
    db: AsyncSession, bot_id: int, owner_id: Optional[int] = None,
) -> BotModel:
    """То же что get_bot, но 404 если не найден / не принадлежит."""
    bot = await get_bot(db, bot_id, owner_id)
    if bot is None:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


async def get_bot_by_telegram_id(
    db: AsyncSession, telegram_id: int, owner_id: Optional[int] = None,
) -> Optional[BotModel]:
    """Бот по telegram_id; опц. с проверкой владельца. None если не найден."""
    query = select(BotModel).where(BotModel.telegram_id == telegram_id)
    if owner_id is not None:
        query = query.where(BotModel.owner_id == owner_id)
    return (await db.execute(query)).scalar_one_or_none()
