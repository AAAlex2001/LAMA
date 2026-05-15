from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.publications.series import (
    PublicationSeriesCreate,
    PublicationSeriesResponse,
    PublicationSeriesUpdate,
)
from backend.services.publications.features.series.create_series import CreateSeries
from backend.services.publications.features.series.delete_series import DeleteSeries
from backend.services.publications.features.series.update_series import UpdateSeries

router = APIRouter(prefix="/series")


@router.post(
    "",
    response_model=PublicationSeriesResponse,
    status_code=201,
    summary="Создать серию публикаций",
)
async def create_series(
    data: PublicationSeriesCreate,
    db: AsyncSession = Depends(get_db),
):
    return await CreateSeries(db).execute(
        name=data.name,
        description=data.description,
        reply_to_previous=data.reply_to_previous,
    )


@router.patch(
    "/{series_id}",
    response_model=PublicationSeriesResponse,
    summary="Частично обновить серию",
)
async def update_series(
    data: PublicationSeriesUpdate,
    series_id: int = Path(..., description="ID серии."),
    db: AsyncSession = Depends(get_db),
):
    return await UpdateSeries(db).execute(series_id, data)


@router.delete(
    "/{series_id}",
    summary="Удалить серию (и все её публикации)",
)
async def delete_series(
    series_id: int = Path(..., description="ID серии."),
    db: AsyncSession = Depends(get_db),
):
    deleted_count = await DeleteSeries(db).execute(series_id)
    return {"deleted_count": deleted_count}
