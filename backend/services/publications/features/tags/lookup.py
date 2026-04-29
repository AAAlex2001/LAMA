"""Поиск тега пользователя — общий хелпер."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Tag


async def find_tag_or_404(db: AsyncSession, tag_id: int, owner_id: int) -> Tag:
    """Тег пользователя или 404."""
    tag = (await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.owner_id == owner_id)
    )).scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


def escape_like(s: str) -> str:
    """Экранирует %, _, \\ для безопасного ILIKE."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
