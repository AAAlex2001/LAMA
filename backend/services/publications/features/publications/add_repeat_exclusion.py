"""Добавление одной даты в repeat_excluded_dates публикации."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication


class AddRepeatExclusion:
    """Добавляет date_str в repeat_excluded_dates (без дублирования)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, publication: Publication, date_str: str) -> None:
        excluded = list(publication.repeat_excluded_dates or [])
        if date_str not in excluded:
            excluded.append(date_str)
        publication.repeat_excluded_dates = excluded
        await self.db.flush()
