"""Постраничный список публикаций пользователя с фильтрами и проекцией повторов."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only, selectinload

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
    Tag,
    publication_channels,
    publication_tags,
)
from backend.schemas.publications.enums import ContentType, PublicationStatus
from backend.services.publications.features.publications.column_loaders import (
    CHANNEL_COMPACT_COLUMNS,
    PUB_COMPACT_COLUMNS,
    TAG_COMPACT_COLUMNS,
)
from backend.services.publications.features.publications.merge_repeating import merge_repeating


class ListPublications:
    """Облегчённый список публикаций (compact-загрузка) с фильтрами и пагинацией."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
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
        skip = max(0, skip)
        limit = min(max(1, limit), 500)

        query = build_filtered_query(
            owner_id=owner_id,
            status=status,
            content_type=content_type,
            channel_id=channel_id,
            tag_names=tag_names,
            tag_ids=tag_ids,
            series_id=series_id,
            start_date=start_date,
            end_date=end_date,
            search=search,
            date_mode=date_mode,
        )
        query = apply_pagination_and_sort(query, date_mode, sort_order, skip, limit)

        posts = list((await self.db.execute(query)).scalars().all())

        if start_date and end_date and owner_id:
            posts = await merge_repeating(self.db, posts, start_date, end_date, owner_id)

        return posts


# ──────────────────────────────────────────────────────────────────────
# Запрос: фильтры и сортировка собираются отдельно
# ──────────────────────────────────────────────────────────────────────


def build_filtered_query(
    owner_id: Optional[int],
    status: Optional[PublicationStatus],
    content_type: Optional[ContentType],
    channel_id: Optional[int],
    tag_names: Optional[List[str]],
    tag_ids: Optional[List[int]],
    series_id: Optional[int],
    start_date: Optional[datetime],
    end_date: Optional[datetime],
    search: Optional[str],
    date_mode: Optional[str],
):
    """Базовый SELECT + load_only + все фильтры одним местом."""
    query = (
        select(Publication)
        .options(
            load_only(*PUB_COMPACT_COLUMNS),
            selectinload(Publication.channels).load_only(*CHANNEL_COMPACT_COLUMNS),
            selectinload(Publication.tags).load_only(*TAG_COMPACT_COLUMNS),
        )
    )
    if owner_id is not None:
        query = query.where(Publication.owner_id == owner_id)

    column_conditions = collect_column_conditions(
        status, content_type, series_id, start_date, end_date, date_mode,
    )
    if column_conditions:
        query = query.where(and_(*column_conditions))

    if channel_id:
        query = query.where(channel_filter(channel_id))
    if tag_ids:
        query = query.where(tag_ids_filter(tag_ids))
    elif tag_names:
        query = query.where(tag_names_filter(tag_names, owner_id))
    if search:
        text = search.strip()
        if text:
            query = query.where(Publication.text_content.ilike(f"%{escape_like(text)}%"))

    return query


def apply_pagination_and_sort(
    query, date_mode: Optional[str], sort_order: Optional[str], skip: int, limit: int,
):
    """Сортировка по primary_date_field + tie-breaker по id + offset/limit."""
    primary_date = primary_date_field(date_mode)
    order_asc = (sort_order or "").lower() == "asc"
    order_expr = primary_date.asc() if order_asc else primary_date.desc()
    id_tie = Publication.id.asc() if order_asc else Publication.id.desc()
    return query.order_by(order_expr, id_tie).offset(skip).limit(limit)


def primary_date_field(date_mode: Optional[str]):
    """Какое поле даты использовать для фильтра/сортировки."""
    mode = (date_mode or "scheduled").lower()
    if mode == "published":
        return Publication.published_time
    if mode == "updated":
        return func.coalesce(Publication.updated_at, Publication.created_at)
    return Publication.scheduled_time


# ──────────────────────────────────────────────────────────────────────
# Условия для query.where() — каждое в своей мини-функции
# ──────────────────────────────────────────────────────────────────────


def collect_column_conditions(
    status: Optional[PublicationStatus],
    content_type: Optional[ContentType],
    series_id: Optional[int],
    start_date: Optional[datetime],
    end_date: Optional[datetime],
    date_mode: Optional[str],
) -> list:
    """Собирает все условия по колонкам Publication в один список."""
    conditions = [status_condition(status, date_mode)]
    if content_type:
        conditions.append(Publication.content_type == DBContentType[content_type.value.upper()])
    if series_id:
        conditions.append(Publication.series_id == series_id)

    date_field = primary_date_field(date_mode)
    if start_date:
        conditions.append(date_field >= start_date)
    if end_date:
        conditions.append(date_field <= end_date)

    return conditions


def status_condition(status: Optional[PublicationStatus], date_mode: Optional[str]):
    """Условие по статусу. Явный status — точный матч; иначе по date_mode."""
    if status:
        return Publication.status == DBPublicationStatus[status.value.upper()]
    if (date_mode or "scheduled").lower() == "published":
        return Publication.status.in_([
            DBPublicationStatus.PUBLISHED,
            DBPublicationStatus.PARTIAL_SUCCESS,
        ])
    return Publication.status.notin_([DBPublicationStatus.DELETED])


def channel_filter(channel_id: int):
    """EXISTS по publication_channels."""
    return exists(
        select(1).select_from(publication_channels).where(
            publication_channels.c.publication_id == Publication.id,
            publication_channels.c.channel_id == channel_id,
        )
    )


def tag_ids_filter(tag_ids: List[int]):
    """EXISTS по publication_tags для списка id."""
    return exists(
        select(1).select_from(publication_tags).where(
            publication_tags.c.publication_id == Publication.id,
            publication_tags.c.tag_id.in_(tag_ids),
        )
    )


def tag_names_filter(tag_names: List[str], owner_id: Optional[int]):
    """EXISTS по publication_tags JOIN Tag для списка имён."""
    sub = (
        select(1)
        .select_from(publication_tags.join(Tag, Tag.id == publication_tags.c.tag_id))
        .where(
            publication_tags.c.publication_id == Publication.id,
            Tag.name.in_(tag_names),
        )
    )
    if owner_id is not None:
        sub = sub.where(Tag.owner_id == owner_id)
    return exists(sub)


def escape_like(s: str) -> str:
    """Экранирует %, _ и \\ для безопасного ILIKE."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
