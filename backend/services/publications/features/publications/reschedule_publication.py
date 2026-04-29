"""Перенос времени публикации с возвратом в SCHEDULED."""

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
)


class ReschedulePublication:
    """Меняет scheduled_time публикации и переводит её в статус SCHEDULED."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, publication: Publication, new_time: datetime) -> Publication:
        publication.scheduled_time = new_time
        publication.status = DBPublicationStatus.SCHEDULED
        await self.db.flush()
        await self.db.refresh(publication)
        return publication
