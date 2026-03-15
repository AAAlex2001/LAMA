from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.schemas.publications.publication_response import DayCount


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

        query = (
            select(date_expr.label("day"), func.count().label("cnt"))
            .where(and_(*filters))
            .group_by(date_expr)
        )

        result = await self.db.execute(query)
        return [DayCount(date=str(row.day), count=row.cnt) for row in result.all()]
