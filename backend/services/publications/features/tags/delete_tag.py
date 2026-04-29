"""Удаление тега пользователя."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.publications.features.tags.lookup import find_tag_or_404


class DeleteTag:
    """Удаляет тег пользователя."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, tag_id: int, owner_id: int) -> None:
        tag = await find_tag_or_404(self.db, tag_id, owner_id)
        await self.db.delete(tag)
        await self.db.flush()
