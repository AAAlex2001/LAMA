from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.services.publications.features.calendar.get_day_counts import GetDayCounts
from backend.services.publications.features.calendar.get_recent_times import GetRecentTimes

router = APIRouter()


@router.get("/day-counts")
async def get_day_counts(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    mode: str = Query("scheduled"),
    tz: str = Query("UTC"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    counts = await GetDayCounts(db).execute(
        start_date, end_date, owner_id=current_user.id, mode=mode, tz=tz,
    )
    return {"counts": counts}


@router.get("/recent-times")
async def get_recent_times(
    limit: int = Query(5, ge=1, le=10),
    tz: str = Query("UTC"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[str]:
    return await GetRecentTimes(db).execute(owner_id=current_user.id, tz=tz, limit=limit)
