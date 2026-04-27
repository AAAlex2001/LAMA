"""Достать или создать набор тегов пользователя — для CreatePublication / UpdatePublication."""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Tag


class GetOrCreateTags:
    """По именам — возвращает существующие теги, недостающие создаёт."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        tag_names: List[str],
        tag_color: Optional[str] = None,
        tag_colors: Optional[List[str]] = None,
        owner_id: Optional[int] = None,
    ) -> List[Tag]:
        """tag_colors[i] для tag_names[i]; иначе — общий tag_color."""
        existing = await fetch_existing(self.db, tag_names, owner_id)
        now = datetime.now(timezone.utc)

        tags: List[Tag] = []
        new_tags: List[Tag] = []

        for idx, name in enumerate(tag_names):
            color = pick_color(idx, tag_color, tag_colors)
            if name in existing:
                tag = existing[name]
                if color and tag.color != color:
                    tag.color = color
                tag.last_used_at = now
                tags.append(tag)
            else:
                new = Tag(name=name, color=color, last_used_at=now, owner_id=owner_id)
                new_tags.append(new)
                tags.append(new)

        if new_tags:
            self.db.add_all(new_tags)
            try:
                await self.db.begin_nested()
                await self.db.flush()
            except IntegrityError:
                refreshed = await fetch_existing(self.db, tag_names, owner_id)
                tags = [refreshed[name] for name in tag_names if name in refreshed]
                for tag in tags:
                    tag.last_used_at = now

        return tags


async def fetch_existing(
    db: AsyncSession, tag_names: List[str], owner_id: Optional[int],
) -> dict[str, Tag]:
    """Существующие теги пользователя по именам, индекс {name: Tag}."""
    query = select(Tag).where(Tag.name.in_(tag_names))
    if owner_id is not None:
        query = query.where(Tag.owner_id == owner_id)
    return {tag.name: tag for tag in (await db.execute(query)).scalars().all()}


def pick_color(idx: int, tag_color: Optional[str], tag_colors: Optional[List[str]]) -> Optional[str]:
    """Цвет: tag_colors[idx] если есть → tag_color → None."""
    if tag_colors and idx < len(tag_colors):
        return tag_colors[idx]
    return tag_color
