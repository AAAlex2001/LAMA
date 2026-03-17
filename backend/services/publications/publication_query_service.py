from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, load_only

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

PUB_COMPACT_COLUMNS = [
    Publication.id,
    Publication.status,
    Publication.content_type,
    Publication.text_content,
    Publication.formatted_content,
    Publication.media_urls,
    Publication.media_thumbnail_urls,
    Publication.media_file_ids,
    Publication.media_blur,
    Publication.inline_keyboard,
    Publication.poll_data,
    Publication.repeat_interval,
    Publication.scheduled_time,
    Publication.published_time,
    Publication.created_at,
    Publication.updated_at,
    Publication.owner_id,
]

CHANNEL_COMPACT_COLUMNS = [
    Channel.id,
    Channel.title,
    Channel.members_count,
    Channel.photo_url,
]

TAG_COMPACT_COLUMNS = [
    Tag.id,
    Tag.name,
    Tag.color,
]


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

    async def get_publications_compact(
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
        date_mode: Optional[str] = "scheduled",
        skip: int = 0,
        limit: int = 100,
    ) -> List[Publication]:
        """Lightweight query: loads only channels and tags (no bot, no series)."""
        skip = max(0, skip)
        limit = min(max(1, limit), 500)

        query = select(Publication)
        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)

        query = self.apply_filters(
            query, status, content_type, channel_id, tag_names, tag_ids,
            series_id, start_date, end_date, search, owner_id, date_mode,
        )

        normalized_mode = (date_mode or "scheduled").lower()
        primary_date = Publication.published_time if normalized_mode == "published" else Publication.scheduled_time
        order_asc = (sort_order or "").lower() == "asc"
        order_expr = primary_date.asc() if order_asc else primary_date.desc()
        id_tie = Publication.id.asc() if order_asc else Publication.id.desc()

        query = (
            query
            .options(
                load_only(*PUB_COMPACT_COLUMNS),
                selectinload(Publication.channels).load_only(*CHANNEL_COMPACT_COLUMNS),
                selectinload(Publication.tags).load_only(*TAG_COMPACT_COLUMNS),
            )
            .order_by(order_expr, id_tie)
            .offset(skip)
            .limit(limit)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    def apply_filters(self, id_query, status, content_type, channel_id,
                       tag_names, tag_ids, series_id, start_date, end_date,
                       search, owner_id, date_mode: Optional[str] = "scheduled"):
        filters = []
        normalized_mode = (date_mode or "scheduled").lower()
        date_field = Publication.published_time if normalized_mode == "published" else Publication.scheduled_time

        if status:
            filters.append(Publication.status == DBPublicationStatus[status.value.upper()])
        elif normalized_mode == "published":
            filters.append(
                Publication.status.in_([
                    DBPublicationStatus.PUBLISHED,
                    DBPublicationStatus.PARTIAL_SUCCESS,
                ])
            )
        if content_type:
            filters.append(Publication.content_type == DBContentType[content_type.value.upper()])
        if series_id:
            filters.append(Publication.series_id == series_id)
        if start_date:
            filters.append(date_field >= start_date)
        if end_date:
            filters.append(date_field <= end_date)
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
