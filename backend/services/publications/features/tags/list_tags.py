"""Постраничный список тегов пользователя."""

from typing import List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Tag


class ListTags:
    """Теги пользователя по страницам, отсортированы по last_used_at desc."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, owner_id: int, page: int, page_size: int) -> tuple[List[Tag], int]:
        total = (await self.db.execute(
            select(func.count(Tag.id)).where(Tag.owner_id == owner_id)
        )).scalar() or 0

        page_query = (
            select(Tag)
            .where(Tag.owner_id == owner_id)
            .order_by(Tag.last_used_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        tags = list((await self.db.execute(page_query)).scalars().all())
        return tags, total
