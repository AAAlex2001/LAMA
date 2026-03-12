from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import TextTemplate
from backend.schemas.publications.templates import (
    TextTemplateCreate,
    TextTemplateUpdate,
    TextTemplateListResponse,
    TextTemplateResponse,
)


class TemplateService:
    """CRUD operations for text templates."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_text_template(self, user_id: int, data: TextTemplateCreate) -> TextTemplate:
        template = TextTemplate(
            owner_id=user_id, name=data.name, formatted_content=data.formatted_content,
        )
        self.db.add(template)
        await self.db.flush()
        await self.db.refresh(template)
        return template

    async def get_text_templates(
        self, user_id: int, search: Optional[str] = None, skip: int = 0, limit: int = 100,
    ) -> TextTemplateListResponse:
        skip = max(0, skip)
        limit = min(max(1, limit), 500)

        query = select(TextTemplate).where(TextTemplate.owner_id == user_id)
        count_query = select(func.count(TextTemplate.id)).where(TextTemplate.owner_id == user_id)

        if search:
            text = search.strip()
            if text:
                query = query.where(TextTemplate.name.ilike(f"%{text}%"))
                count_query = count_query.where(TextTemplate.name.ilike(f"%{text}%"))

        total = int((await self.db.execute(count_query)).scalar() or 0)
        query = query.order_by(TextTemplate.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        templates = list(result.scalars().all())

        return TextTemplateListResponse(items=templates, total=total)

    async def get_text_template_by_id(self, template_id: int, user_id: int) -> TextTemplate:
        query = select(TextTemplate).where(
            TextTemplate.id == template_id, TextTemplate.owner_id == user_id,
        )
        result = await self.db.execute(query)
        template = result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return template

    async def update_text_template(
        self, template_id: int, user_id: int, data: TextTemplateUpdate,
    ) -> TextTemplate:
        template = await self.get_text_template_by_id(template_id, user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(template, field, value)
        await self.db.flush()
        await self.db.refresh(template)
        return template

    async def delete_text_template(self, template_id: int, user_id: int) -> None:
        template = await self.get_text_template_by_id(template_id, user_id)
        await self.db.delete(template)
        await self.db.flush()
