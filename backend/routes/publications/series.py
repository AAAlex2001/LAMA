from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.schemas.publications.series import (
    PublicationSeriesCreate,
    PublicationSeriesUpdate,
    PublicationSeriesResponse,
)
from backend.models.publications import PublicationSeries
from backend.database import get_db
from backend.services.publications.series_service import SeriesService
from backend.routes.publications.dependencies import get_series_service

router = APIRouter(prefix="/series")


@router.post("", response_model=PublicationSeriesResponse, status_code=201)
async def create_series(
    data: PublicationSeriesCreate,
    service: SeriesService = Depends(get_series_service),
):
    return await service.create_series(
        name=data.name,
        description=data.description,
        reply_to_previous=data.reply_to_previous,
    )


@router.patch("/{series_id}", response_model=PublicationSeriesResponse)
async def update_series(
    series_id: int,
    data: PublicationSeriesUpdate,
    service: SeriesService = Depends(get_series_service),
):
    return await service.update_series(series_id, data)
