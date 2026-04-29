"""Удаление серии: уже опубликованные посты помечаются DELETED + ставятся в очередь удаления."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import PublicationStatus as DBPublicationStatus
from backend.services.publications.features.series.get_series_publications import (
    GetSeriesPublications,
)
from backend.services.publications.features.series.lookup import find_series_or_404

PUBLISHED_STATUSES = {
    DBPublicationStatus.PUBLISHED,
    DBPublicationStatus.PARTIAL_SUCCESS,
}


class DeleteSeries:
    """Удаляет серию и её публикации; для уже опубликованных запускает асинхронное удаление в TG."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, series_id: int) -> int:
        """Возвращает число обработанных публикаций (удалённых + помеченных DELETED)."""
        from backend.celery.tasks import delete_publication_messages

        series = await find_series_or_404(self.db, series_id)
        publications = await GetSeriesPublications(self.db).execute(series_id)
        deleted_count = 0

        for pub in publications:
            if pub.status in PUBLISHED_STATUSES:
                pub.status = DBPublicationStatus.DELETED
                delete_publication_messages.apply_async(args=[pub.id], queue="default")
            else:
                await self.db.delete(pub)
            deleted_count += 1

        await self.db.delete(series)
        await self.db.flush()
        return deleted_count
