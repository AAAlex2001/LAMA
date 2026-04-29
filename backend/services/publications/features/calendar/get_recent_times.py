"""Самые частые времена публикаций пользователя — для подсказок в UI."""

from typing import List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
)


class GetRecentTimes:
    """Возвращает топ-N самых частых HH:MM из scheduled_time публикаций пользователя."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, owner_id: int, tz: str = "UTC", limit: int = 5) -> List[str]:
        """Время в формате 'HH:MM', отсортировано по убыванию частоты."""
        time_expr = func.to_char(func.timezone(tz, Publication.scheduled_time), "HH24:MI")
        query = (
            select(time_expr.label("t"), func.count().label("cnt"))
            .where(
                Publication.owner_id == owner_id,
                Publication.scheduled_time.isnot(None),
                Publication.status.notin_([DBPublicationStatus.DELETED]),
            )
            .group_by(time_expr)
            .order_by(func.count().desc())
            .limit(limit)
        )
        rows = (await self.db.execute(query)).all()
        return [row[0] for row in rows]
