"""Поиск повторяющегося сообщения с проверкой владельца."""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, RecurringMessage


async def find_recurring_or_404(
    db: AsyncSession,
    message_id: int,
    owner_id: int,
    bot_id: Optional[int] = None,
) -> RecurringMessage:
    """Recurring-сообщение, чей бот принадлежит owner_id; иначе 404."""
    query = select(RecurringMessage).join(BotModel).where(
        RecurringMessage.id == message_id,
        BotModel.owner_id == owner_id,
    )
    if bot_id is not None:
        query = query.where(RecurringMessage.bot_id == bot_id)
    msg = (await db.execute(query)).scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Recurring message not found")
    return msg
