from typing import List

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackedUpPost


class BackupDayCount(BaseModel):
    """Количество забэкапленных постов за один день."""

    date: str
    count: int


class GetBackupDayCounts:
    """Возвращает количество забэкапленных постов канала по дням."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int) -> List[BackupDayCount]:
        """Возвращает список ``BackupDayCount`` отсортированный по дате."""
        rows = (await self.db.execute(
            select(
                func.date(BackedUpPost.original_date).label("day"),
                func.count(BackedUpPost.id).label("cnt"),
            )
            .where(BackedUpPost.channel_id == channel_id)
            .group_by(func.date(BackedUpPost.original_date))
            .order_by(func.date(BackedUpPost.original_date))
        )).all()

        return [BackupDayCount(date=str(row.day), count=row.cnt) for row in rows]
