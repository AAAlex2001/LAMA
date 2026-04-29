"""Удаление текстового шаблона пользователя."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.publications.features.templates.lookup import find_template_or_404


class DeleteTextTemplate:
    """Удаляет шаблон пользователя."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, template_id: int, user_id: int) -> None:
        template = await find_template_or_404(self.db, template_id, user_id)
        await self.db.delete(template)
        await self.db.flush()
