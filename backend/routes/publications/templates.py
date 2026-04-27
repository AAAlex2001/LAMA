from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.publications.templates import (
    TextTemplateCreate,
    TextTemplateListResponse,
    TextTemplateResponse,
    TextTemplateUpdate,
)
from backend.services.publications.features.templates.create_template import CreateTextTemplate
from backend.services.publications.features.templates.delete_template import DeleteTextTemplate
from backend.services.publications.features.templates.list_templates import ListTextTemplates
from backend.services.publications.features.templates.lookup import find_template_or_404
from backend.services.publications.features.templates.update_template import UpdateTextTemplate

router = APIRouter(prefix="/text-templates")


@router.post("/", response_model=TextTemplateResponse, status_code=201)
async def create_text_template(
    data: TextTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateTextTemplate(db).execute(current_user.id, data)


@router.get("/", response_model=TextTemplateListResponse)
async def list_text_templates(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ListTextTemplates(db).execute(current_user.id, search, skip, limit)


@router.get("/{template_id}", response_model=TextTemplateResponse)
async def get_text_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_template_or_404(db, template_id, current_user.id)


@router.patch("/{template_id}", response_model=TextTemplateResponse)
async def update_text_template(
    template_id: int,
    data: TextTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateTextTemplate(db).execute(template_id, current_user.id, data)


@router.delete("/{template_id}", status_code=204)
async def delete_text_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteTextTemplate(db).execute(template_id, current_user.id)
