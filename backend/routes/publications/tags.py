from fastapi import APIRouter, Depends, Path, Query
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


@router.get(
    "/",
    response_model=TagListResponse,
    summary="Список тегов пользователя",
)
async def list_tags(
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1."),
    page_size: int = Query(20, ge=1, le=100, description="Размер страницы."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tags, total = await ListTags(db).execute(current_user.id, page, page_size)
    return TagListResponse(items=tags, total=total)


@router.get(
    "/search",
    response_model=TagListResponse,
    summary="Поиск тегов по подстроке (для автодополнения)",
)
async def search_tags(
    q: str = Query(..., min_length=1, max_length=100, description="Подстрока для ILIKE поиска."),
    limit: int = Query(10, ge=1, le=50, description="Сколько результатов вернуть."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tags = await SearchTags(db).execute(current_user.id, q, limit)
    return TagListResponse(items=tags, total=len(tags))


@router.post(
    "/",
    response_model=TagResponse,
    status_code=201,
    summary="Создать тег",
)
async def create_tag(
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateTag(db).execute(current_user.id, data.name, data.color)


@router.put(
    "/{tag_id}",
    response_model=TagResponse,
    summary="Обновить тег (имя и/или цвет)",
)
async def update_tag(
    data: TagUpdate,
    tag_id: int = Path(..., description="ID тега."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateTag(db).execute(tag_id, current_user.id, data.name, data.color)


@router.delete(
    "/{tag_id}",
    status_code=204,
    summary="Удалить тег",
)
async def delete_tag(
    tag_id: int = Path(..., description="ID тега."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteTag(db).execute(tag_id, current_user.id)
