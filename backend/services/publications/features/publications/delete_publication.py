"""Удаление публикации."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication


class DeletePublication:
    """Жёсткое удаление публикации из БД."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, publication: Publication) -> None:
        await self.db.delete(publication)
        await self.db.flush()
