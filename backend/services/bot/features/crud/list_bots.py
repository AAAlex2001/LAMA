"""Постраничный список ботов с фильтрами."""

from typing import List, Optional, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotStatus


class ListBots:
    """Боты пользователя + total."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: Optional[int] = None,
        status: Optional[BotStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[BotModel], int]:
        query = build_filtered_query(owner_id, status)

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar() or 0

        rows = (await self.db.execute(
            query.order_by(desc(BotModel.created_at)).offset(skip).limit(limit)
        )).scalars().all()
        return list(rows), total


def build_filtered_query(owner_id: Optional[int], status: Optional[BotStatus]):
    """SELECT BotModel с применёнными фильтрами."""
    query = select(BotModel)
    if owner_id is not None:
        query = query.where(BotModel.owner_id == owner_id)
    if status:
        query = query.where(BotModel.status == status)
    return query
