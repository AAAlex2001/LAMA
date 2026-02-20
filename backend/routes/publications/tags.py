from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from backend.schemas.publications.tags import (
    TagCreate,
    TagUpdate,
    TagResponse,
    TagListResponse,
)
from backend.models.publications import Tag
from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User

router = APIRouter(prefix="/tags")


@router.get("/", response_model=TagListResponse)
async def list_tags(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tags_query = (
        select(Tag)
        .where(Tag.owner_id == current_user.id)
        .order_by(Tag.last_used_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(tags_query)
    tags = list(result.scalars().all())

    total_result = await db.execute(
        select(func.count(Tag.id)).where(Tag.owner_id == current_user.id)
    )
    total = total_result.scalar() or 0

    return TagListResponse(items=tags, total=total)


@router.get("/search", response_model=TagListResponse)
async def search_tags(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    safe_q = q.replace("%", "").replace("_", "")
    query = (
        select(Tag)
        .where(Tag.owner_id == current_user.id, Tag.name.ilike(f"%{safe_q}%"))
        .order_by(Tag.name)
        .limit(limit)
    )
    result = await db.execute(query)
    tags = list(result.scalars().all())
    return TagListResponse(items=tags, total=len(tags))


@router.post("/", response_model=TagResponse, status_code=201)
async def create_tag(
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(Tag).where(Tag.owner_id == current_user.id, Tag.name == data.name)
    )
    existing_tag = existing.scalar_one_or_none()

    if existing_tag:
        if data.color and existing_tag.color != data.color:
            existing_tag.color = data.color
            await db.commit()
            await db.refresh(existing_tag)
        return existing_tag

    tag = Tag(name=data.name, color=data.color, owner_id=current_user.id)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    data: TagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.owner_id == current_user.id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    if data.name is not None and data.name != tag.name:
        dup = await db.execute(
            select(Tag).where(
                Tag.owner_id == current_user.id, Tag.name == data.name, Tag.id != tag_id
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Tag with this name already exists")
        tag.name = data.name

    if data.color is not None:
        tag.color = data.color

    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.owner_id == current_user.id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    await db.delete(tag)
    await db.commit()
