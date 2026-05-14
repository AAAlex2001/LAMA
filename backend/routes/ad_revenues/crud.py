from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
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


async def _find_or_404(db: AsyncSession, ad_revenue_id: int, owner_id: int):
    item = await GetAdRevenue(db).execute(ad_revenue_id, owner_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AdRevenue not found")
    return item


@router.get("/", response_model=AdRevenueListResponse)
async def list_ad_revenues(
    type: Optional[AdRevenueType] = Query(None),
    channel_id: Optional[int] = Query(None),
    bot_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    sort_by: Optional[Literal["date", "price", "type", "comments", "views", "clicks", "reactions"]] = Query(None),
    sort_dir: Literal["asc", "desc"] = Query("desc"),
    status_filter: Optional[Literal["scheduled", "published"]] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdRevenueListResponse:
    items, total = await ListAdRevenues(db).execute(
        owner_id=current_user.id,
        type_=type,
        channel_id=channel_id,
        bot_id=bot_id,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_dir=sort_dir,
        status=status_filter,
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
    currency: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdRevenueStats:
    return await GetAdRevenueStats(db).execute(
        owner_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
        channel_id=channel_id,
        bot_id=bot_id,
        currency=currency,
    )


@router.post("/", response_model=AdRevenueResponse, status_code=status.HTTP_201_CREATED)
async def create_ad_revenue(
    payload: AdRevenueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdRevenueResponse:
    item = await CreateAdRevenue(db).execute(owner_id=current_user.id, payload=payload)
    return AdRevenueResponse.model_validate(item)


@router.get("/{ad_revenue_id}", response_model=AdRevenueResponse)
async def get_ad_revenue(
    ad_revenue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdRevenueResponse:
    item = await _find_or_404(db, ad_revenue_id, current_user.id)
    return AdRevenueResponse.model_validate(item)


@router.patch("/{ad_revenue_id}", response_model=AdRevenueResponse)
async def update_ad_revenue(
    ad_revenue_id: int,
    payload: AdRevenueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdRevenueResponse:
    item = await _find_or_404(db, ad_revenue_id, current_user.id)
    updated = await UpdateAdRevenue(db).execute(item, payload)
    return AdRevenueResponse.model_validate(updated)


@router.delete("/{ad_revenue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ad_revenue(
    ad_revenue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    item = await _find_or_404(db, ad_revenue_id, current_user.id)
    await DeleteAdRevenue(db).execute(item)
