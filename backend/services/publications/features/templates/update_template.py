"""Обновление полей текстового шаблона."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import TextTemplate
from backend.schemas.publications.templates import TextTemplateUpdate
from backend.services.publications.features.templates.lookup import find_template_or_404


class UpdateTextTemplate:
    """Обновляет только переданные поля шаблона (exclude_unset)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, template_id: int, user_id: int, data: TextTemplateUpdate,
    ) -> TextTemplate:
        template = await find_template_or_404(self.db, template_id, user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(template, field, value)
        await self.db.flush()
        await self.db.refresh(template)
        return template
