"""Остановка повторов с указанной даты (повтор будет ходить до from_date)."""

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication


class StopRepeatFrom:
    """Ставит repeat_end_time=from_date и обнуляет next_repeat_time."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, publication: Publication, from_date: datetime) -> None:
        publication.repeat_end_time = from_date
        publication.next_repeat_time = None
        await self.db.flush()
