from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from backend.schemas.publications import (
    TextTemplateCreate,
    TextTemplateUpdate,
    TextTemplateResponse,
    TextTemplateListResponse,
)
from backend.services.publications.CRUD_text_templates import (
    create_text_template,
    get_text_templates,
    get_text_template_by_id,
    update_text_template,
    delete_text_template,
)
from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User


router = APIRouter(prefix="/text-templates", tags=["text-templates"])


@router.post("/", response_model=TextTemplateResponse, status_code=201)
async def create_template(
    data: TextTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Создать новый текстовый шаблон"""
    template = await create_text_template(db, current_user.id, data)
    return template


@router.get("/", response_model=TextTemplateListResponse)
async def list_templates(
    search: Optional[str] = Query(None, description="Поиск по названию"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить список шаблонов пользователя"""
    templates, total = await get_text_templates(db, current_user.id, search, skip, limit)
    return TextTemplateListResponse(items=templates, total=total)


@router.get("/{template_id}", response_model=TextTemplateResponse)
async def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить шаблон по ID"""
    template = await get_text_template_by_id(db, template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.patch("/{template_id}", response_model=TextTemplateResponse)
async def update_template(
    template_id: int,
    data: TextTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновить текстовый шаблон"""
    template = await update_text_template(db, template_id, current_user.id, data)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удалить текстовый шаблон"""
    success = await delete_text_template(db, template_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return None
