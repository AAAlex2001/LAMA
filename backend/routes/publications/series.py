from fastapi import APIRouter, Depends
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


@router.post("", response_model=PublicationSeriesResponse, status_code=201)
async def create_series(
    data: PublicationSeriesCreate,
    db: AsyncSession = Depends(get_db),
):
    return await CreateSeries(db).execute(
        name=data.name,
        description=data.description,
        reply_to_previous=data.reply_to_previous,
    )


@router.patch("/{series_id}", response_model=PublicationSeriesResponse)
async def update_series(
    series_id: int,
    data: PublicationSeriesUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await UpdateSeries(db).execute(series_id, data)


@router.delete("/{series_id}")
async def delete_series(
    series_id: int,
    db: AsyncSession = Depends(get_db),
):
    deleted_count = await DeleteSeries(db).execute(series_id)
    return {"deleted_count": deleted_count}
