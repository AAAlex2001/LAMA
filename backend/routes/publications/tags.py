from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.publications.tags import (
    TagCreate,
    TagListResponse,
    TagResponse,
    TagUpdate,
)
from backend.services.publications.features.tags.create_tag import CreateTag
from backend.services.publications.features.tags.delete_tag import DeleteTag
from backend.services.publications.features.tags.list_tags import ListTags
from backend.services.publications.features.tags.search_tags import SearchTags
from backend.services.publications.features.tags.update_tag import UpdateTag

router = APIRouter(prefix="/tags")


@router.get("/", response_model=TagListResponse)
async def list_tags(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tags, total = await ListTags(db).execute(current_user.id, page, page_size)
    return TagListResponse(items=tags, total=total)


@router.get("/search", response_model=TagListResponse)
async def search_tags(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tags = await SearchTags(db).execute(current_user.id, q, limit)
    return TagListResponse(items=tags, total=len(tags))


@router.post("/", response_model=TagResponse, status_code=201)
async def create_tag(
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateTag(db).execute(current_user.id, data.name, data.color)


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    data: TagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateTag(db).execute(tag_id, current_user.id, data.name, data.color)


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteTag(db).execute(tag_id, current_user.id)
