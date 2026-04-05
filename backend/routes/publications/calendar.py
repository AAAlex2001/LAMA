from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Query

from backend.services.publications.calendar_service import CalendarService
from backend.routes.publications.dependencies import get_calendar_service
from backend.routes.auth import get_current_user
from backend.models.auth import User

router = APIRouter()


@router.get("/day-counts")
async def get_day_counts(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    mode: str = Query("scheduled"),
    tz: str = Query("UTC"),
    service: CalendarService = Depends(get_calendar_service),
    current_user: User = Depends(get_current_user),
):
    counts = await service.get_day_counts(start_date, end_date, owner_id=current_user.id, mode=mode, tz=tz)
    return {"counts": counts}


@router.get("/recent-times")
async def get_recent_times(
    limit: int = Query(5, ge=1, le=10),
    tz: str = Query("UTC"),
    service: CalendarService = Depends(get_calendar_service),
    current_user: User = Depends(get_current_user),
) -> List[str]:
    return await service.get_recent_times(owner_id=current_user.id, tz=tz, limit=limit)
