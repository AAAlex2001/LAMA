from datetime import datetime
from typing import List, Optional

import pytz
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.schemas.publications.publication_response import DayCount


class CalendarService:
    """Calendar and day-count queries for publications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_calendar(self, year: int, month: int, owner_id: Optional[int] = None) -> List[Publication]:
        start = datetime(year, month, 1, tzinfo=pytz.UTC)
        end = (
            datetime(year + 1, 1, 1, tzinfo=pytz.UTC)
            if month == 12
            else datetime(year, month + 1, 1, tzinfo=pytz.UTC)
        )

        query = (
            select(Publication)
            .where(
                and_(
                    Publication.scheduled_time >= start,
                    Publication.scheduled_time < end,
                    Publication.status.in_([DBPublicationStatus.SCHEDULED, DBPublicationStatus.PUBLISHED]),
                )
            )
            .options(selectinload(Publication.channels), selectinload(Publication.tags))
            .order_by(Publication.scheduled_time)
            .limit(500)
        )
        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_day_counts(
        self,
        start_date: datetime,
        end_date: datetime,
        owner_id: Optional[int] = None,
    ) -> List[DayCount]:
        date_expr = func.date(Publication.scheduled_time)
        query = (
            select(date_expr.label("day"), func.count().label("cnt"))
            .where(
                and_(
                    Publication.scheduled_time.isnot(None),
                    Publication.scheduled_time >= start_date,
                    Publication.scheduled_time <= end_date,
                    Publication.status.notin_([DBPublicationStatus.DELETED]),
                )
            )
            .group_by(date_expr)
        )
        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)

        result = await self.db.execute(query)
        return [DayCount(date=str(row.day), count=row.cnt) for row in result.all()]
