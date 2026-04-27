"""Постраничный список шаблонов с поиском по имени."""

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import TextTemplate
from backend.schemas.publications.templates import TextTemplateListResponse


class ListTextTemplates:
    """Шаблоны пользователя по страницам, опц. фильтр по подстроке имени."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        user_id: int,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> TextTemplateListResponse:
        skip = max(0, skip)
        limit = min(max(1, limit), 500)

        filters = [TextTemplate.owner_id == user_id]
        if search:
            text = search.strip()
            if text:
                safe = escape_like(text)
                filters.append(TextTemplate.name.ilike(f"%{safe}%"))

        total = int((await self.db.execute(
            select(func.count(TextTemplate.id)).where(*filters)
        )).scalar() or 0)

        page_query = (
            select(TextTemplate)
            .where(*filters)
            .order_by(TextTemplate.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items = list((await self.db.execute(page_query)).scalars().all())
        return TextTemplateListResponse(items=items, total=total)


def escape_like(s: str) -> str:
    """Экранирует %, _, \\ для безопасного ILIKE."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
