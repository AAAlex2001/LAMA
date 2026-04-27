"""Проекция будущих повторов на даты диапазона — для счётчиков календаря."""

from datetime import datetime
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)
from backend.schemas.publications.publication_response import DayCount
from backend.services.publications.utils.repeat_utils import (
    project_repeat_occurrences,
    to_user_tz,
)


class ProjectRepeats:
    """Считает, сколько повторов попадает на каждую дату диапазона (без дублей с базой)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        start_date: datetime,
        end_date: datetime,
        owner_id: int,
        tz: str = "UTC",
    ) -> List[DayCount]:
        """Возвращает per-day счётчики проецированных повторов."""
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
            .options(load_only(
                Publication.id,
                Publication.status,
                Publication.scheduled_time,
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
                Publication.repeat_excluded_dates,
            ))
        )
        repeating = (await self.db.execute(query)).scalars().all()

        per_day: dict[str, int] = {}
        seen: set = set()

        for pub in repeating:
            base_local_date = None
            if pub.status == DBPublicationStatus.SCHEDULED and pub.scheduled_time:
                base_local_date = to_user_tz(pub.scheduled_time, tz).strftime("%Y-%m-%d")
            for date_str, projected_time in project_repeat_occurrences(pub, start_date, end_date):
                local_date = (
                    to_user_tz(projected_time, tz).strftime("%Y-%m-%d") if tz != "UTC" else date_str
                )
                if base_local_date is not None and local_date == base_local_date:
                    continue
                key = (pub.id, local_date)
                if key not in seen:
                    per_day[local_date] = per_day.get(local_date, 0) + 1
                    seen.add(key)

        return [
            DayCount(date=day, count=cnt, published=cnt)
            for day, cnt in per_day.items()
        ]
