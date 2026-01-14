from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.models.publications import TextTemplate
from backend.schemas.publications import TextTemplateCreate, TextTemplateUpdate


async def create_text_template(
    db: AsyncSession,
    user_id: int,
    data: TextTemplateCreate
) -> TextTemplate:
    """Создать новый текстовый шаблон"""
    template = TextTemplate(
        owner_id=user_id,
        name=data.name,
        formatted_content=data.formatted_content
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


async def get_text_templates(
    db: AsyncSession,
    user_id: int,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> tuple[List[TextTemplate], int]:
    """Получить список шаблонов пользователя с пагинацией"""
    query = select(TextTemplate).where(TextTemplate.owner_id == user_id)
    
    if search:
        query = query.where(TextTemplate.name.ilike(f"%{search}%"))
    
    count_query = select(TextTemplate.id).where(TextTemplate.owner_id == user_id)
    if search:
        count_query = count_query.where(TextTemplate.name.ilike(f"%{search}%"))
    
    total_result = await db.execute(count_query)
    total = len(total_result.all())
    
    query = query.order_by(TextTemplate.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    templates = result.scalars().all()
    
    return list(templates), total


async def get_text_template_by_id(
    db: AsyncSession,
    template_id: int,
    user_id: int
) -> Optional[TextTemplate]:
    """Получить шаблон по ID"""
    query = select(TextTemplate).where(
        and_(
            TextTemplate.id == template_id,
            TextTemplate.owner_id == user_id
        )
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def update_text_template(
    db: AsyncSession,
    template_id: int,
    user_id: int,
    data: TextTemplateUpdate
) -> Optional[TextTemplate]:
    """Обновить текстовый шаблон"""
    template = await get_text_template_by_id(db, template_id, user_id)
    if not template:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    await db.commit()
    await db.refresh(template)
    return template


async def delete_text_template(
    db: AsyncSession,
    template_id: int,
    user_id: int
) -> bool:
    """Удалить текстовый шаблон"""
    template = await get_text_template_by_id(db, template_id, user_id)
    if not template:
        return False
    
    await db.delete(template)
    await db.commit()
    return True
