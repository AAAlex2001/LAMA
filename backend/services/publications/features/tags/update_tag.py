"""Переименование/перекраска тега пользователя."""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Tag
from backend.services.publications.features.tags.lookup import find_tag_or_404


class UpdateTag:
    """Меняет name (если нет конфликта) и/или color у тега пользователя."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, tag_id: int, owner_id: int, name: Optional[str], color: Optional[str],
    ) -> Tag:
        """Бросает 409 если новое имя уже занято другим тегом этого пользователя."""
        tag = await find_tag_or_404(self.db, tag_id, owner_id)

        if name is not None and name != tag.name:
            duplicate = (await self.db.execute(
                select(Tag).where(
                    Tag.owner_id == owner_id, Tag.name == name, Tag.id != tag_id,
                )
            )).scalar_one_or_none()
            if duplicate:
                raise HTTPException(status_code=409, detail="Tag with this name already exists")
            tag.name = name

        if color is not None:
            tag.color = color

        await self.db.flush()
        await self.db.refresh(tag)
        return tag
