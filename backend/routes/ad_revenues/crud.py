import io
from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.responses import StreamingResponse
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
    CommunityStatsResponse,
    MonthlyAdStatsResponse,
)
from backend.schemas.ad_revenues.enums import AdRevenueType
from backend.services.ad_revenues.features.create_ad_revenue import CreateAdRevenue
from backend.services.ad_revenues.features.delete_ad_revenue import DeleteAdRevenue
from backend.services.ad_revenues.features.export_ad_revenues import ExportAdRevenues
from backend.services.ad_revenues.features.get_ad_revenue import GetAdRevenue
from backend.services.ad_revenues.features.get_ad_revenue_stats import GetAdRevenueStats
from backend.services.ad_revenues.features.get_community_stats import (
    COMMUNITY_FILTERS,
    GetCommunityStats,
)
from backend.services.ad_revenues.features.get_monthly_stats import GetMonthlyAdStats
from backend.services.ad_revenues.features.list_ad_revenues import ListAdRevenues
from backend.services.ad_revenues.features.update_ad_revenue import UpdateAdRevenue

VALID_DATA_TYPES = {"general_income", "general_expense", "ads_income", "ads_expense"}

router = APIRouter()


async def find_or_404(db: AsyncSession, ad_revenue_id: int, owner_id: int):
    item = await GetAdRevenue(db).execute(ad_revenue_id, owner_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AdRevenue not found")
    return item


@router.get(
    "/",
    response_model=AdRevenueListResponse,
    summary="Список рекламных строк (доходы + расходы)",
)
async def list_ad_revenues(
    type: Optional[AdRevenueType] = Query(
        None,
        description="Фильтр по типу: income — доходы, expense — расходы.",
    ),
    channel_id: Optional[int] = Query(
        None,
        description="Только строки, привязанные к этому каналу (id из таблицы channel_groups).",
    ),
    bot_id: Optional[int] = Query(
        None,
        description="Только строки, привязанные к этому боту.",
    ),
    date_from: Optional[date] = Query(
        None,
        description="Нижняя граница revenue_date (включительно), формат YYYY-MM-DD.",
    ),
    date_to: Optional[date] = Query(
        None,
        description="Верхняя граница revenue_date (включительно), формат YYYY-MM-DD.",
    ),
    sort_by: Optional[Literal["date", "price", "type", "comments", "views", "clicks", "reactions"]] = Query(
        None,
        description="Поле сортировки. По умолчанию — date.",
    ),
    sort_dir: Literal["asc", "desc"] = Query(
        "desc",
        description="Направление сортировки.",
    ),
    status_filter: Optional[Literal["scheduled", "published"]] = Query(
        None,
        alias="status",
        description="Фильтр по статусу связанной публикации (для синтетических строк).",
    ),
    limit: int = Query(
        50,
        ge=1,
        le=200,
        description="Размер страницы.",
    ),
    offset: int = Query(
        0,
        ge=0,
        description="Сдвиг для пагинации.",
    ),
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
    return AdRevenueListResponse(items=items, total=total)


@router.get(
    "/monthly",
    response_model=MonthlyAdStatsResponse,
    summary="Помесячные доходы/расходы за год (для графика)",
)
async def monthly_ad_stats(
    year: Optional[int] = Query(
        None,
        description="Календарный год. Если не задан — берётся текущий год.",
    ),
    currency: Optional[str] = Query(
        None,
        description="Фильтр по валюте (например, RUB / USD / EUR).",
    ),
    channel_id: Optional[int] = Query(
        None,
        description="Только данные по выбранному каналу.",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MonthlyAdStatsResponse:
    resolved_year = year or date.today().year
    months = await GetMonthlyAdStats(db).execute(
        owner_id=current_user.id,
        year=resolved_year,
        currency=currency,
        channel_id=channel_id,
    )
    return MonthlyAdStatsResponse(year=resolved_year, months=months)


@router.get(
    "/communities",
    response_model=CommunityStatsResponse,
    summary="Сводка по каналам/группам/ботам",
)
async def community_stats(
    date_from: Optional[date] = Query(
        None,
        description="Нижняя граница периода.",
    ),
    date_to: Optional[date] = Query(
        None,
        description="Верхняя граница периода.",
    ),
    currency: Optional[str] = Query(
        None,
        description="Фильтр по валюте.",
    ),
    kind: Literal["all", "channels", "groups", "bots"] = Query(
        "all",
        description="Какой тип сообществ показывать.",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommunityStatsResponse:
    if kind not in COMMUNITY_FILTERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid kind")
    items = await GetCommunityStats(db).execute(
        owner_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
        currency=currency,
        kind=kind,
    )
    return CommunityStatsResponse(items=items)


@router.get(
    "/stats",
    response_model=AdRevenueStats,
    summary="Сводная статистика для StatsRow",
)
async def stats_ad_revenues(
    date_from: Optional[date] = Query(
        None,
        description="Нижняя граница периода.",
    ),
    date_to: Optional[date] = Query(
        None,
        description="Верхняя граница периода.",
    ),
    channel_id: Optional[int] = Query(
        None,
        description="Только данные по выбранному каналу.",
    ),
    bot_id: Optional[int] = Query(
        None,
        description="Только данные по выбранному боту.",
    ),
    currency: Optional[str] = Query(
        None,
        description="Активная валюта. Если не задана — берётся первая из списка валют пользователя.",
    ),
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


@router.get(
    "/export",
    summary="Экспорт рекламных записей (xlsx / csv)",
)
async def export_ad_revenues(
    data_types: str = Query(
        ...,
        description=(
            "Список секций через запятую. Допустимые значения: "
            "general_income, general_expense, ads_income, ads_expense."
        ),
    ),
    scope: Literal["filtered", "all"] = Query(
        "filtered",
        description="filtered — применить фильтры из остальных параметров; all — выгрузить всё по пользователю.",
    ),
    format: Literal["xlsx", "csv"] = Query(
        "xlsx",
        description="Формат выгрузки.",
    ),
    date_from: Optional[date] = Query(
        None,
        description="Нижняя граница периода (учитывается при scope='filtered').",
    ),
    date_to: Optional[date] = Query(
        None,
        description="Верхняя граница периода (учитывается при scope='filtered').",
    ),
    channel_id: Optional[int] = Query(
        None,
        description="Фильтр по каналу (учитывается при scope='filtered').",
    ),
    bot_id: Optional[int] = Query(
        None,
        description="Фильтр по боту (учитывается при scope='filtered').",
    ),
    currency: Optional[str] = Query(
        None,
        description="Фильтр по валюте (учитывается при scope='filtered').",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    requested = {t.strip() for t in data_types.split(",") if t.strip()}
    invalid = requested - VALID_DATA_TYPES
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown data types: {', '.join(sorted(invalid))}")
    if not requested:
        raise HTTPException(status_code=400, detail="At least one data type required")

    blob = await ExportAdRevenues(db).execute(
        owner_id=current_user.id,
        data_types=requested,
        scope=scope,
        export_format=format,
        date_from=date_from,
        date_to=date_to,
        channel_id=channel_id,
        bot_id=bot_id,
        currency=currency,
    )

    filename = f"ad-revenues-{date.today().isoformat()}.{format}"
    media_type = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if format == "xlsx"
        else "text/csv; charset=utf-8"
    )
    return StreamingResponse(
        io.BytesIO(blob),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/",
    response_model=AdRevenueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать запись о доходе или расходе",
)
async def create_ad_revenue(
    payload: AdRevenueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdRevenueResponse:
    item = await CreateAdRevenue(db).execute(owner_id=current_user.id, payload=payload)
    return AdRevenueResponse.model_validate(item)


@router.get(
    "/{ad_revenue_id}",
    response_model=AdRevenueResponse,
    summary="Получить одну запись",
)
async def get_ad_revenue(
    ad_revenue_id: int = Path(
        ...,
        description="ID записи. Положительный — реальная AdRevenue; отрицательный — синтетическая строка из publication.",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdRevenueResponse:
    item = await find_or_404(db, ad_revenue_id, current_user.id)
    return AdRevenueResponse.model_validate(item)


@router.patch(
    "/{ad_revenue_id}",
    response_model=AdRevenueResponse,
    summary="Частично обновить запись",
)
async def update_ad_revenue(
    payload: AdRevenueUpdate,
    ad_revenue_id: int = Path(
        ...,
        description="ID реальной AdRevenue (положительное число).",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdRevenueResponse:
    item = await find_or_404(db, ad_revenue_id, current_user.id)
    updated = await UpdateAdRevenue(db).execute(item, payload)
    return AdRevenueResponse.model_validate(updated)


@router.delete(
    "/{ad_revenue_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить запись или снять флаг is_ad с публикации",
)
async def delete_ad_revenue(
    ad_revenue_id: int = Path(
        ...,
        description=(
            "ID записи. Положительный — удаляется AdRevenue (а связанная публикация теряет рекламные поля). "
            "Отрицательный — у publication c id=|ad_revenue_id| сбрасывается is_ad и поля ad_*."
        ),
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    deleted = await DeleteAdRevenue(db).execute(ad_revenue_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AdRevenue not found")
