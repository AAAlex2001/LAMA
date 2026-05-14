from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.models.auth import User
from backend.routes.ad_revenues.dependencies import (
    get_create_service,
    get_delete_service,
    get_list_service,
    get_lookup_service,
    get_stats_service,
    get_update_service,
)
from backend.routes.auth import get_current_user
from backend.schemas.ad_revenues.ad_revenue import (
    AdRevenueCreate,
    AdRevenueListResponse,
    AdRevenueResponse,
    AdRevenueStats,
    AdRevenueUpdate,
)
from backend.schemas.ad_revenues.enums import AdRevenueType
from backend.services.ad_revenues.features.create_ad_revenue import CreateAdRevenue
from backend.services.ad_revenues.features.delete_ad_revenue import DeleteAdRevenue
from backend.services.ad_revenues.features.get_ad_revenue import GetAdRevenue
from backend.services.ad_revenues.features.get_ad_revenue_stats import GetAdRevenueStats
from backend.services.ad_revenues.features.list_ad_revenues import ListAdRevenues
from backend.services.ad_revenues.features.update_ad_revenue import UpdateAdRevenue

router = APIRouter()


@router.get("/", response_model=AdRevenueListResponse)
async def list_ad_revenues(
    type: Optional[AdRevenueType] = Query(None),
    channel_id: Optional[int] = Query(None),
    bot_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    service: ListAdRevenues = Depends(get_list_service),
) -> AdRevenueListResponse:
    items, total = await service.execute(
        owner_id=current_user.id,
        type_=type,
        channel_id=channel_id,
        bot_id=bot_id,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return AdRevenueListResponse(
        items=[AdRevenueResponse.model_validate(item) for item in items],
        total=total,
    )


@router.get("/stats", response_model=AdRevenueStats)
async def stats_ad_revenues(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    channel_id: Optional[int] = Query(None),
    bot_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    service: GetAdRevenueStats = Depends(get_stats_service),
) -> AdRevenueStats:
    return await service.execute(
        owner_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
        channel_id=channel_id,
        bot_id=bot_id,
    )


@router.post("/", response_model=AdRevenueResponse, status_code=status.HTTP_201_CREATED)
async def create_ad_revenue(
    payload: AdRevenueCreate,
    current_user: User = Depends(get_current_user),
    service: CreateAdRevenue = Depends(get_create_service),
) -> AdRevenueResponse:
    item = await service.execute(owner_id=current_user.id, payload=payload)
    return AdRevenueResponse.model_validate(item)


@router.get("/{ad_revenue_id}", response_model=AdRevenueResponse)
async def get_ad_revenue(
    ad_revenue_id: int,
    current_user: User = Depends(get_current_user),
    service: GetAdRevenue = Depends(get_lookup_service),
) -> AdRevenueResponse:
    item = await service.execute(ad_revenue_id, current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AdRevenue not found")
    return AdRevenueResponse.model_validate(item)


@router.patch("/{ad_revenue_id}", response_model=AdRevenueResponse)
async def update_ad_revenue(
    ad_revenue_id: int,
    payload: AdRevenueUpdate,
    current_user: User = Depends(get_current_user),
    lookup: GetAdRevenue = Depends(get_lookup_service),
    service: UpdateAdRevenue = Depends(get_update_service),
) -> AdRevenueResponse:
    item = await lookup.execute(ad_revenue_id, current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AdRevenue not found")
    updated = await service.execute(item, payload)
    return AdRevenueResponse.model_validate(updated)


@router.delete("/{ad_revenue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ad_revenue(
    ad_revenue_id: int,
    current_user: User = Depends(get_current_user),
    lookup: GetAdRevenue = Depends(get_lookup_service),
    service: DeleteAdRevenue = Depends(get_delete_service),
) -> None:
    item = await lookup.execute(ad_revenue_id, current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AdRevenue not found")
    await service.execute(item)
