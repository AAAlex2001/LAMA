from datetime import datetime
from typing import Optional

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackedUpPost


def filter_posts(
    query: Select,
    content_types: Optional[list[str]],
    start_date: Optional[datetime],
    end_date: Optional[datetime],
) -> Select:
    """Применяет общие фильтры backup-job к запросу постов."""
    if content_types:
        query = query.where(BackedUpPost.content_type.in_(content_types))
    if start_date:
        query = query.where(BackedUpPost.original_date >= start_date)
    if end_date:
        query = query.where(BackedUpPost.original_date <= end_date)
    return query


async def count_posts(
    db: AsyncSession,
    channel_id: int,
    content_types: Optional[list[str]],
    start_date: Optional[datetime],
    end_date: Optional[datetime],
) -> int:
    """Считает посты канала под фильтры backup-job."""
    base = select(func.count(BackedUpPost.id)).where(BackedUpPost.channel_id == channel_id)
    return (await db.execute(filter_posts(base, content_types, start_date, end_date))).scalar() or 0


async def pick_post_at(
    db: AsyncSession,
    channel_id: int,
    content_types: Optional[list[str]],
    start_date: Optional[datetime],
    end_date: Optional[datetime],
    offset: int,
) -> Optional[BackedUpPost]:
    """Возвращает один пост с offset в порядке original_date asc."""
    base = select(BackedUpPost).where(BackedUpPost.channel_id == channel_id)
    query = (
        filter_posts(base, content_types, start_date, end_date)
        .order_by(BackedUpPost.original_date.asc())
        .offset(offset)
        .limit(1)
    )
    return (await db.execute(query)).scalar_one_or_none()
