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


@router.get(
    "/day-counts",
    summary="Сколько публикаций приходится на каждый день в диапазоне (для точек в календаре)",
)
async def get_day_counts(
    start_date: datetime = Query(..., description="Начало диапазона (включительно)."),
    end_date: datetime = Query(..., description="Конец диапазона (включительно)."),
    mode: str = Query(
        "scheduled",
        description="Какое поле даты использовать: scheduled / published / updated.",
    ),
    tz: str = Query("UTC", description="Часовой пояс юзера для группировки по дням."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    counts = await GetDayCounts(db).execute(
        start_date, end_date, owner_id=current_user.id, mode=mode, tz=tz,
    )
    return {"counts": counts}


@router.get(
    "/recent-times",
    summary="Список недавно использованных времён публикации (для пресетов времени)",
)
async def get_recent_times(
    limit: int = Query(5, ge=1, le=10, description="Сколько последних времён вернуть."),
    tz: str = Query("UTC", description="Часовой пояс для отображения."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[str]:
    return await GetRecentTimes(db).execute(owner_id=current_user.id, tz=tz, limit=limit)
