"""Поиск тегов пользователя по подстроке имени."""

from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Tag
from backend.services.publications.features.tags.lookup import escape_like


class SearchTags:
    """Поиск тегов пользователя ILIKE %query% с лимитом."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, owner_id: int, query: str, limit: int) -> List[Tag]:
        safe = escape_like(query)
        stmt = (
            select(Tag)
            .where(Tag.owner_id == owner_id, Tag.name.ilike(f"%{safe}%"))
            .order_by(Tag.name)
            .limit(limit)
        )
        return list((await self.db.execute(stmt)).scalars().all())
