from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
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
