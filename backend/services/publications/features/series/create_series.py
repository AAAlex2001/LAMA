"""Создание серии публикаций."""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import PublicationSeries


class CreateSeries:
    """Создаёт PublicationSeries."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        name: str,
        description: Optional[str] = None,
        reply_to_previous: bool = True,
    ) -> PublicationSeries:
        series = PublicationSeries(
            name=name,
            description=description,
            reply_to_previous=reply_to_previous,
        )
        self.db.add(series)
        await self.db.flush()
        await self.db.refresh(series)
        return series
