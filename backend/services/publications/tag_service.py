from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Tag


class TagService:
    """Get or create tags for publications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_tags(
        self,
        tag_names: List[str],
        tag_color: Optional[str] = None,
        tag_colors: Optional[List[str]] = None,
        owner_id: Optional[int] = None,
    ) -> List[Tag]:
        query = select(Tag).where(Tag.name.in_(tag_names))
        if owner_id is not None:
            query = query.where(Tag.owner_id == owner_id)
        result = await self.db.execute(query)
        existing_tags = {tag.name: tag for tag in result.scalars().all()}

        tags: List[Tag] = []
        new_tags: List[Tag] = []
        now = datetime.now(timezone.utc)

        for idx, name in enumerate(tag_names):
            color = tag_colors[idx] if tag_colors and idx < len(tag_colors) else tag_color
            if name in existing_tags:
                tag = existing_tags[name]
                if color and tag.color != color:
                    tag.color = color
                tag.last_used_at = now
                tags.append(tag)
            else:
                new_tag = Tag(name=name, color=color, last_used_at=now, owner_id=owner_id)
                new_tags.append(new_tag)
                tags.append(new_tag)

        if new_tags:
            self.db.add_all(new_tags)
            try:
                await self.db.begin_nested()
                await self.db.flush()
            except IntegrityError:
                query = select(Tag).where(Tag.name.in_(tag_names))
                if owner_id is not None:
                    query = query.where(Tag.owner_id == owner_id)
                result = await self.db.execute(query)
                existing_tags = {tag.name: tag for tag in result.scalars().all()}
                tags = [existing_tags[name] for name in tag_names if name in existing_tags]
                for tag in tags:
                    tag.last_used_at = now

        return tags

    async def list_tags(self, owner_id: int, page: int, page_size: int) -> tuple[List[Tag], int]:
        tags_query = (
            select(Tag)
            .where(Tag.owner_id == owner_id)
            .order_by(Tag.last_used_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(tags_query)
        tags = list(result.scalars().all())

        total_result = await self.db.execute(
            select(func.count(Tag.id)).where(Tag.owner_id == owner_id)
        )
        total = total_result.scalar() or 0
        return tags, total

    async def search_tags(self, owner_id: int, query_str: str, limit: int) -> List[Tag]:
        safe_q = query_str.replace('%', '').replace('_', '')
        query = (
            select(Tag)
            .where(Tag.owner_id == owner_id, Tag.name.ilike(f'%{safe_q}%'))
            .order_by(Tag.name)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_tag(self, owner_id: int, name: str, color: Optional[str]) -> Tag:
        existing = await self.db.execute(
            select(Tag).where(Tag.owner_id == owner_id, Tag.name == name)
        )
        existing_tag = existing.scalar_one_or_none()

        if existing_tag:
            if color and existing_tag.color != color:
                existing_tag.color = color
                await self.db.flush()
                await self.db.refresh(existing_tag)
            return existing_tag

        tag = Tag(name=name, color=color, owner_id=owner_id)
        self.db.add(tag)
        await self.db.flush()
        await self.db.refresh(tag)
        return tag

    async def update_tag(self, tag_id: int, owner_id: int, name: Optional[str], color: Optional[str]) -> Tag:
        result = await self.db.execute(
            select(Tag).where(Tag.id == tag_id, Tag.owner_id == owner_id)
        )
        tag = result.scalar_one_or_none()
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        if name is not None and name != tag.name:
            dup = await self.db.execute(
                select(Tag).where(
                    Tag.owner_id == owner_id, Tag.name == name, Tag.id != tag_id
                )
            )
            if dup.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="Tag with this name already exists")
            tag.name = name

        if color is not None:
            tag.color = color

        await self.db.flush()
        await self.db.refresh(tag)
        return tag

    async def delete_tag(self, tag_id: int, owner_id: int) -> None:
        result = await self.db.execute(
            select(Tag).where(Tag.id == tag_id, Tag.owner_id == owner_id)
        )
        tag = result.scalar_one_or_none()
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        await self.db.delete(tag)
        await self.db.flush()
