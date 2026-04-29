"""Trigger lookup helpers."""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, Trigger


async def find_trigger_or_404(
    db: AsyncSession, trigger_id: int, owner_id: Optional[int] = None,
) -> Trigger:
    """Return trigger by ID and optional owner, or raise 404."""
    query = select(Trigger).where(Trigger.id == trigger_id)
    if owner_id is not None:
        query = query.join(BotModel).where(BotModel.owner_id == owner_id)
    trigger = (await db.execute(query)).scalar_one_or_none()
    if trigger is None:
        raise HTTPException(status_code=404, detail="Trigger not found")
    return trigger


async def ensure_bot_exists(db: AsyncSession, bot_id: int, owner_id: Optional[int]) -> None:
    """Raise 404 when bot does not exist or does not belong to owner."""
    query = select(BotModel).where(BotModel.id == bot_id)
    if owner_id is not None:
        query = query.where(BotModel.owner_id == owner_id)
    if not (await db.execute(query)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Bot not found")