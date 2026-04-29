"""Обновление полей серии публикаций."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import PublicationSeries
from backend.schemas.publications.series import PublicationSeriesUpdate
from backend.services.publications.features.series.lookup import find_series_or_404


class UpdateSeries:
    """Точечное обновление полей серии (exclude_unset)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, series_id: int, data: PublicationSeriesUpdate,
    ) -> PublicationSeries:
        series = await find_series_or_404(self.db, series_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(series, field, value)
        await self.db.flush()
        await self.db.refresh(series)
        return series
