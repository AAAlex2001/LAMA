from datetime import datetime

from fastapi import APIRouter, Depends, Query, Path

from backend.services.publications.publication_service import PublicationService
from backend.routes.publications.dependencies import get_publication_service
from backend.routes.auth import get_current_user
from backend.models.auth import User

router = APIRouter()


@router.get("/calendar/{year}/{month}")
async def get_calendar(
    year: int = Path(...),
    month: int = Path(..., ge=1, le=12),
    timezone: str = Query("UTC"),
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    entries = await service.get_calendar(year, month, timezone, owner_id=current_user.id)
    return {"calendar": entries}


@router.get("/day-counts")
async def get_day_counts(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    mode: str = Query("scheduled"),
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    counts = await service.get_day_counts(start_date, end_date, owner_id=current_user.id, mode=mode)
    return {"counts": counts}
