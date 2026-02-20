from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.schemas.publications.templates import (
    TextTemplateCreate,
    TextTemplateUpdate,
    TextTemplateResponse,
    TextTemplateListResponse,
)
from backend.services.publications.publication_service import PublicationService
from backend.routes.publications.dependencies import get_publication_service
from backend.routes.auth import get_current_user
from backend.models.auth import User

router = APIRouter(prefix="/text-templates")


@router.post("/", response_model=TextTemplateResponse, status_code=201)
async def create_text_template(
    data: TextTemplateCreate,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    return await service.create_text_template(current_user.id, data)


@router.get("/", response_model=TextTemplateListResponse)
async def list_text_templates(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    return await service.get_text_templates(current_user.id, search, skip, limit)


@router.get("/{template_id}", response_model=TextTemplateResponse)
async def get_text_template(
    template_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    return await service.get_text_template_by_id(template_id, current_user.id)


@router.patch("/{template_id}", response_model=TextTemplateResponse)
async def update_text_template(
    template_id: int,
    data: TextTemplateUpdate,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    return await service.update_text_template(template_id, current_user.id, data)


@router.delete("/{template_id}", status_code=204)
async def delete_text_template(
    template_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    await service.delete_text_template(template_id, current_user.id)
