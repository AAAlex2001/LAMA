from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import TextTemplate
from backend.schemas.publications import TextTemplateCreate, TextTemplateUpdate


class PublicationTemplatesCRUDService:
    """CRUD-операции для пользовательских текстовых шаблонов."""

    def __init__(self, db: AsyncSession):
        """Инициализировать сервис с асинхронной сессией БД."""
        self.db = db

    async def create_text_template(self, user_id: int, data: TextTemplateCreate) -> TextTemplate:
        """Создать новый текстовый шаблон пользователя."""
        template = TextTemplate(
            owner_id=user_id,
            name=data.name,
            formatted_content=data.formatted_content,
        )
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def get_text_templates(
        self,
        user_id: int,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[TextTemplate], int]:
        """Получить шаблоны пользователя с пагинацией и общим количеством."""
        skip = max(0, skip)
        limit = min(max(1, limit), 500)

        query = select(TextTemplate).where(TextTemplate.owner_id == user_id)
        count_query = select(func.count(TextTemplate.id)).where(TextTemplate.owner_id == user_id)

        if search:
            search_text = search.strip()
            if search_text:
                query = query.where(TextTemplate.name.ilike(f"%{search_text}%"))
                count_query = count_query.where(TextTemplate.name.ilike(f"%{search_text}%"))

        total_result = await self.db.execute(count_query)
        total = int(total_result.scalar() or 0)

        query = query.order_by(TextTemplate.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        templates = result.scalars().all()
        return list(templates), total

    async def get_text_template_by_id(self, template_id: int, user_id: int) -> Optional[TextTemplate]:
        """Получить шаблон по ID, принадлежащий пользователю."""
        query = select(TextTemplate).where(
            TextTemplate.id == template_id,
            TextTemplate.owner_id == user_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_text_template(
        self,
        template_id: int,
        user_id: int,
        data: TextTemplateUpdate,
    ) -> Optional[TextTemplate]:
        """Обновить шаблон по ID для пользователя."""
        template = await self.get_text_template_by_id(template_id, user_id)
        if not template:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)

        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def delete_text_template(self, template_id: int, user_id: int) -> bool:
        """Удалить шаблон по ID для пользователя."""
        template = await self.get_text_template_by_id(template_id, user_id)
        if not template:
            return False

        await self.db.delete(template)
        await self.db.commit()
        return True
