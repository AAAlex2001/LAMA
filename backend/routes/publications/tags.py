from fastapi import APIRouter, Depends, Query
from typing import Optional

from backend.schemas.publications.tags import (
    TagCreate,
    TagUpdate,
    TagResponse,
    TagListResponse,
)
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.routes.publications.dependencies import get_tag_service
from backend.services.publications.tag_service import TagService

router = APIRouter(prefix="/tags")


@router.get("/", response_model=TagListResponse)
async def list_tags(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
):
    tags, total = await service.list_tags(current_user.id, page, page_size)
    return TagListResponse(items=tags, total=total)


@router.get("/search", response_model=TagListResponse)
async def search_tags(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
):
    tags = await service.search_tags(current_user.id, q, limit)
    return TagListResponse(items=tags, total=len(tags))


@router.post("/", response_model=TagResponse, status_code=201)
async def create_tag(
    data: TagCreate,
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
):
    return await service.create_tag(current_user.id, data.name, data.color)


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    data: TagUpdate,
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
):
    return await service.update_tag(tag_id, current_user.id, data.name, data.color)


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: int,
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
):
    await service.delete_tag(tag_id, current_user.id)
    await service.delete_tag(tag_id, current_user.id)
