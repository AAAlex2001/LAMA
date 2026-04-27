"""Создание текстового шаблона."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import TextTemplate
from backend.schemas.publications.templates import TextTemplateCreate


class CreateTextTemplate:
    """Создаёт TextTemplate пользователя."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, user_id: int, data: TextTemplateCreate) -> TextTemplate:
        template = TextTemplate(
            owner_id=user_id,
            name=data.name,
            formatted_content=data.formatted_content,
        )
        self.db.add(template)
        await self.db.flush()
        await self.db.refresh(template)
        return template
