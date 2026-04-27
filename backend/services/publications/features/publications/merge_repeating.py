"""Подмешивание повторяющихся публикаций в готовый список (для календарных выдач)."""

from datetime import datetime
from typing import List, Set, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only, selectinload

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)
from backend.services.publications.features.publications.column_loaders import (
    CHANNEL_COMPACT_COLUMNS,
    PUB_COMPACT_COLUMNS,
    REPEAT_EXTRA_COLUMNS,
    TAG_COMPACT_COLUMNS,
)
from backend.services.publications.features.publications.projection import (
    make_scheduled_projection,
)
from backend.services.publications.utils.repeat_utils import (
    project_repeat_occurrences,
    strip_tz,
)


async def merge_repeating(
    db: AsyncSession,
    posts: List[Publication],
    start_date: datetime,
    end_date: datetime,
    owner_id: int,
) -> List[Publication]:
    """Добавляет к posts проекции повторяющихся публикаций, попадающих в диапазон."""
    existing_keys: Set[Tuple[int, str]] = set()
    for p in posts:
        if p.scheduled_time:
            existing_keys.add((p.id, strip_tz(p.scheduled_time).strftime("%Y-%m-%d")))

    query = (
        select(Publication)
        .where(
            Publication.owner_id == owner_id,
            Publication.repeat_interval != DBRepeatInterval.NEVER,
            Publication.status.in_([
                DBPublicationStatus.PUBLISHED,
                DBPublicationStatus.PARTIAL_SUCCESS,
                DBPublicationStatus.SCHEDULED,
            ]),
        )
        .options(
            load_only(*PUB_COMPACT_COLUMNS, *REPEAT_EXTRA_COLUMNS),
            selectinload(Publication.channels).load_only(*CHANNEL_COMPACT_COLUMNS),
            selectinload(Publication.tags).load_only(*TAG_COMPACT_COLUMNS),
        )
    )
    repeating = list((await db.execute(query)).scalars().all())

    seen: Set[Tuple[int, str]] = set()
    for pub in repeating:
        for day_key, projected_time in project_repeat_occurrences(pub, start_date, end_date):
            key = (pub.id, day_key)
            if key in seen or key in existing_keys:
                continue
            seen.add(key)
            posts.append(make_scheduled_projection(pub, projected_time))

    return posts
