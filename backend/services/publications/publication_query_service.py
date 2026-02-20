from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
    Tag,
    TelegramMessage,
    publication_channels,
    publication_tags,
)
from backend.schemas.publications.enums import ContentType, PublicationStatus


def escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class PublicationQueryService:
    """Read operations for publications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_publication(self, publication_id: int, owner_id: Optional[int] = None) -> Optional[Publication]:
        query = (
            select(Publication)
            .where(Publication.id == publication_id)
            .options(
                selectinload(Publication.channels).selectinload(Channel.bot),
                selectinload(Publication.tags),
                selectinload(Publication.series),
                selectinload(Publication.telegram_messages)
                .selectinload(TelegramMessage.channel)
                .selectinload(Channel.bot),
            )
        )
        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_publications(
        self,
        owner_id: Optional[int] = None,
        status: Optional[PublicationStatus] = None,
        content_type: Optional[ContentType] = None,
        channel_id: Optional[int] = None,
        tag_names: Optional[List[str]] = None,
        tag_ids: Optional[List[int]] = None,
        series_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None,
        sort_order: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Publication]:
        skip = max(0, skip)
        limit = min(max(1, limit), 500)

        id_query = select(Publication.id)
        if owner_id is not None:
            id_query = id_query.where(Publication.owner_id == owner_id)

        id_query = self.apply_filters(
            id_query, status, content_type, channel_id, tag_names, tag_ids,
            series_id, start_date, end_date, search, owner_id,
        )

        source_date = func.coalesce(Publication.scheduled_time, Publication.updated_at, Publication.created_at)
        order_asc = (sort_order or "").lower() == "asc"
        order_expr = source_date.asc() if order_asc else source_date.desc()
        id_tie = Publication.id.asc() if order_asc else Publication.id.desc()

        id_subquery = id_query.order_by(order_expr, id_tie).offset(skip).limit(limit).subquery()

        full_query = (
            select(Publication)
            .join(id_subquery, Publication.id == id_subquery.c.id)
            .options(
                selectinload(Publication.channels).selectinload(Channel.bot),
                selectinload(Publication.tags),
                selectinload(Publication.series),
            )
            .order_by(order_expr, id_tie)
        )

        result = await self.db.execute(full_query)
        return list(result.scalars().all())

    def apply_filters(self, id_query, status, content_type, channel_id,
                       tag_names, tag_ids, series_id, start_date, end_date,
                       search, owner_id):
        filters = []
        if status:
            filters.append(Publication.status == DBPublicationStatus[status.value.upper()])
        if content_type:
            filters.append(Publication.content_type == DBContentType[content_type.value.upper()])
        if series_id:
            filters.append(Publication.series_id == series_id)
        if start_date:
            filters.append(Publication.scheduled_time >= start_date)
        if end_date:
            filters.append(Publication.scheduled_time <= end_date)
        if filters:
            id_query = id_query.where(and_(*filters))

        if channel_id:
            id_query = id_query.where(
                exists(
                    select(1).select_from(publication_channels).where(
                        publication_channels.c.publication_id == Publication.id,
                        publication_channels.c.channel_id == channel_id,
                    )
                )
            )

        if tag_ids:
            id_query = id_query.where(
                exists(
                    select(1).select_from(publication_tags).where(
                        publication_tags.c.publication_id == Publication.id,
                        publication_tags.c.tag_id.in_(tag_ids),
                    )
                )
            )
        elif tag_names:
            tag_sub = (
                select(1)
                .select_from(publication_tags.join(Tag, Tag.id == publication_tags.c.tag_id))
                .where(publication_tags.c.publication_id == Publication.id, Tag.name.in_(tag_names))
            )
            if owner_id is not None:
                tag_sub = tag_sub.where(Tag.owner_id == owner_id)
            id_query = id_query.where(exists(tag_sub))

        if search:
            text = search.strip()
            if text:
                id_query = id_query.where(Publication.text_content.ilike(f"%{escape_like(text)}%"))

        return id_query
