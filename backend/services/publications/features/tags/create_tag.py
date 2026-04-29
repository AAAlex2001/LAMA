"""Создание тега пользователя; идемпотентно по (owner_id, name)."""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Tag


class CreateTag:
    """Создаёт тег; если тег с таким именем уже есть — возвращает его (опц. обновляя цвет)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, owner_id: int, name: str, color: Optional[str]) -> Tag:
        existing = (await self.db.execute(
            select(Tag).where(Tag.owner_id == owner_id, Tag.name == name)
        )).scalar_one_or_none()

        if existing:
            if color and existing.color != color:
                existing.color = color
                await self.db.flush()
                await self.db.refresh(existing)
            return existing

        tag = Tag(name=name, color=color, owner_id=owner_id)
        self.db.add(tag)
        await self.db.flush()
        await self.db.refresh(tag)
        return tag
