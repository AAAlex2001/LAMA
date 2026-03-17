from datetime import datetime, timedelta
from typing import Dict, List, Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)
from backend.schemas.publications.publication_response import DayCount
from backend.services.publications.repeat_calculator import calculate_next_repeat_time


class CalendarService:
    """Calendar and day-count queries for publications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_day_counts(
        self,
        start_date: datetime,
        end_date: datetime,
        owner_id: Optional[int] = None,
        mode: str = "scheduled",
    ) -> List[DayCount]:
        normalized_mode = (mode or "scheduled").lower()

        if normalized_mode == "published":
            date_field = Publication.published_time
            status_filter = Publication.status.in_(
                [DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]
            )
        else:
            date_field = Publication.scheduled_time
            status_filter = Publication.status.notin_([DBPublicationStatus.DELETED])

        date_expr = func.date(date_field)
        filters = [
            date_field.isnot(None),
            date_field >= start_date,
            date_field <= end_date,
            status_filter,
        ]
        if owner_id is not None:
            filters.insert(0, Publication.owner_id == owner_id)

        published_count = func.count(case(
            (Publication.status.in_([DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]), 1),
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

        result = await self.db.execute(query)
        counts: Dict[str, DayCount] = {}
        for row in result.all():
            date_str = str(row.day)
            counts[date_str] = DayCount(
                date=date_str,
                count=row.cnt,
                published=row.published,
                scheduled=row.scheduled,
                draft=row.draft,
            )

        if owner_id is not None:
            projections = await self.project_repeats(start_date, end_date, owner_id)
            for date_str, proj_count in projections.items():
                if date_str in counts:
                    dc = counts[date_str]
                    counts[date_str] = DayCount(
                        date=date_str,
                        count=dc.count + proj_count,
                        published=dc.published + proj_count,
                        scheduled=dc.scheduled,
                        draft=dc.draft,
                    )
                else:
                    counts[date_str] = DayCount(
                        date=date_str,
                        count=proj_count,
                        published=proj_count,
                        scheduled=0,
                        draft=0,
                    )

        return list(counts.values())

    async def project_repeats(
        self,
        start_date: datetime,
        end_date: datetime,
        owner_id: int,
    ) -> Dict[str, int]:
        """Проецирует будущие повторы на даты в диапазоне."""
        query = (
            select(Publication)
            .where(
                Publication.owner_id == owner_id,
                Publication.repeat_interval != DBRepeatInterval.NEVER,
                Publication.status.in_([
                    DBPublicationStatus.PUBLISHED,
                    DBPublicationStatus.PARTIAL_SUCCESS,
                ]),
                Publication.next_repeat_time.isnot(None),
            )
            .options(load_only(
                Publication.id,
                Publication.next_repeat_time,
                Publication.repeat_interval,
                Publication.repeat_custom_days,
                Publication.repeat_custom_hours,
                Publication.repeat_end_time,
                Publication.repeat_custom_unit,
                Publication.repeat_custom_value,
                Publication.repeat_weekdays,
                Publication.repeat_month_days,
                Publication.repeat_year_month,
                Publication.repeat_year_days,
            ))
        )
        result = await self.db.execute(query)
        repeating_pubs = result.scalars().all()

        projections: Dict[str, int] = {}
        seen: set = set()
        naive_start = strip_tz(start_date)
        naive_end = strip_tz(end_date)

        for pub in repeating_pubs:
            current = fast_forward_to(
                pub.next_repeat_time, naive_start,
                pub.repeat_interval, pub.repeat_custom_days, pub.repeat_custom_hours,
            )
            if current is None:
                continue

            max_in_range = 200
            iterations = 0

            while current and current <= naive_end and iterations < max_in_range:
                if current >= naive_start:
                    date_str = current.strftime("%Y-%m-%d")
                    key = (pub.id, date_str)
                    if key not in seen:
                        projections[date_str] = projections.get(date_str, 0) + 1
                        seen.add(key)

                current = calculate_next_repeat_time(
                    current,
                    pub.repeat_interval,
                    pub.repeat_custom_days,
                    pub.repeat_custom_hours,
                    pub.repeat_end_time,
                    pub.repeat_custom_unit,
                    pub.repeat_custom_value,
                    pub.repeat_weekdays,
                    pub.repeat_month_days,
                    pub.repeat_year_month,
                    pub.repeat_year_days,
                )
                iterations += 1

        return projections


def strip_tz(dt: datetime) -> datetime:
    """Убирает timezone info для безопасного сравнения."""
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


def fast_forward_to(
    current: datetime,
    target: datetime,
    interval: DBRepeatInterval,
    custom_days: Optional[int],
    custom_hours: Optional[int],
) -> Optional[datetime]:
    """Прыжок к target без пошаговой итерации."""
    current = strip_tz(current)
    target = strip_tz(target)

    if current >= target:
        return current

    diff = target - current

    if interval == DBRepeatInterval.DAILY:
        return current + timedelta(days=diff.days)
    if interval == DBRepeatInterval.WEEKLY:
        return current + timedelta(weeks=diff.days // 7)
    if interval == DBRepeatInterval.BIWEEKLY:
        return current + timedelta(weeks=(diff.days // 14) * 2)
    if interval == DBRepeatInterval.MONTHLY:
        months = (target.year - current.year) * 12 + target.month - current.month
        return current + relativedelta(months=max(0, months - 1))
    if interval == DBRepeatInterval.YEARLY:
        years = target.year - current.year
        return current + relativedelta(years=max(0, years - 1))
    if interval == DBRepeatInterval.CUSTOM:
        days = custom_days or 0
        hours = custom_hours or 0
        step_seconds = days * 86400 + hours * 3600
        if step_seconds > 0:
            jumps = int(diff.total_seconds() // step_seconds)
            return current + timedelta(seconds=jumps * step_seconds)

    return current
