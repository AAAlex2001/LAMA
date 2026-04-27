"""Поиск текстового шаблона пользователя."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import TextTemplate


async def find_template_or_404(
    db: AsyncSession, template_id: int, user_id: int,
) -> TextTemplate:
    """Шаблон пользователя или 404."""
    template = (await db.execute(
        select(TextTemplate).where(
            TextTemplate.id == template_id, TextTemplate.owner_id == user_id,
        )
    )).scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template
