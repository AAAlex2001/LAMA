"""Счётчики публикаций по дням диапазона: published / scheduled / draft / повторы / бот-сообщения."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.schemas.publications.publications import DayCount
from backend.services.publications.features.calendar.count_bot_messages_per_day import (
    CountBotMessagesPerDay,
)
from backend.services.publications.features.calendar.project_repeats import ProjectRepeats
from backend.services.publications.utils.repeat_utils import local_range_to_utc


class GetDayCounts:
    """Базовый счётчик по статусам + проекции повторов + бот-сообщения."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        start_date: datetime,
        end_date: datetime,
        owner_id: Optional[int] = None,
        mode: str = "scheduled",
        tz: str = "UTC",
    ) -> List[DayCount]:
        """mode = 'scheduled' | 'published' — определяет какое поле даты использовать."""
        utc_start, utc_end = local_range_to_utc(start_date, end_date, tz)

        counts_map = await self.fetch_base_counts(utc_start, utc_end, owner_id, mode, tz)

        if owner_id is not None:
            for dc in await ProjectRepeats(self.db).execute(utc_start, utc_end, owner_id, tz=tz):
                counts_map[dc.date] = merge_repeat(counts_map.get(dc.date), dc)

            for bc in await CountBotMessagesPerDay(self.db).execute(utc_start, utc_end, owner_id, tz=tz):
                counts_map[bc.date] = merge_bot_messages(counts_map.get(bc.date), bc)

        return list(counts_map.values())

    async def fetch_base_counts(
        self,
        utc_start: datetime,
        utc_end: datetime,
        owner_id: Optional[int],
        mode: str,
        tz: str,
    ) -> dict[str, DayCount]:
        """Считает реальные публикации по дате+статусу."""
        normalized = (mode or "scheduled").lower()
        if normalized == "published":
            date_field = Publication.published_time
            status_filter = Publication.status.in_(
                [DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]
            )
        else:
            date_field = Publication.scheduled_time
            status_filter = Publication.status.notin_([DBPublicationStatus.DELETED])

        date_expr = func.date(func.timezone(tz, date_field))
        filters = [
            date_field.isnot(None),
            date_field >= utc_start,
            date_field <= utc_end,
            status_filter,
        ]
        if owner_id is not None:
            filters.insert(0, Publication.owner_id == owner_id)

        published_count = func.count(case(
            (Publication.status.in_(
                [DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]
            ), 1),
        ))
        scheduled_count = func.count(case(
            (Publication.status == DBPublicationStatus.SCHEDULED, 1),
        ))
        draft_count = func.count(case(
            (Publication.status == DBPublicationStatus.DRAFT, 1),
        ))

        query = (
            select(
                date_expr.label("day"),
                func.count().label("cnt"),
                published_count.label("published"),
                scheduled_count.label("scheduled"),
                draft_count.label("draft"),
            )
            .where(and_(*filters))
            .group_by(date_expr)
        )
        rows = (await self.db.execute(query)).all()

        counts_map: dict[str, DayCount] = {}
        for row in rows:
            date_str = str(row.day)
            counts_map[date_str] = DayCount(
                date=date_str,
                count=row.cnt,
                published=row.published,
                scheduled=row.scheduled,
                draft=row.draft,
            )
        return counts_map


def merge_repeat(existing: Optional[DayCount], proj: DayCount) -> DayCount:
    """Прибавляет повторы к существующему счётчику дня (или создаёт новый)."""
    if existing is None:
        return proj
    return DayCount(
        date=existing.date,
        count=existing.count + proj.count,
        published=existing.published + proj.published,
        scheduled=existing.scheduled,
        draft=existing.draft,
    )


def merge_bot_messages(existing: Optional[DayCount], bc: DayCount) -> DayCount:
    """Прибавляет бот-сообщения к существующему счётчику дня (или создаёт новый)."""
    if existing is None:
        return bc
    return DayCount(
        date=existing.date,
        count=existing.count + bc.count,
        published=existing.published + bc.published,
        scheduled=existing.scheduled,
        draft=existing.draft,
        bot_messages=existing.bot_messages + bc.bot_messages,
    )
