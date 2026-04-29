"""Постраничный список повторяющихся сообщений бота."""

from typing import List, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import RecurringMessage
from backend.services.bot.features.crud.lookup import find_bot_or_404


class ListRecurring:
    """Сообщения бота + total."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, bot_id: int, owner_id: int, skip: int = 0, limit: int = 100,
    ) -> Tuple[List[RecurringMessage], int]:
        await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        base = select(RecurringMessage).where(RecurringMessage.bot_id == bot_id)
        total = (await self.db.execute(
            select(func.count()).select_from(base.subquery())
        )).scalar() or 0

        rows = (await self.db.execute(
            base.order_by(RecurringMessage.created_at.desc()).offset(skip).limit(limit)
        )).scalars().all()
        return list(rows), total
