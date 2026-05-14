"""Сводная статистика рекламных доходов и расходов с фильтрацией по валюте."""

from datetime import date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue
from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.schemas.ad_revenues.ad_revenue import AdRevenueStats
from backend.schemas.ad_revenues.enums import AdRevenueType


class GetAdRevenueStats:
    """Сводная статистика рекламных доходов/расходов и счётчиков рекламы."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        channel_id: Optional[int] = None,
        bot_id: Optional[int] = None,
        currency: Optional[str] = None,
    ) -> AdRevenueStats:
        currencies = await self._fetch_currencies(owner_id)
        active_currency = self._pick_currency(currency, currencies)

        money = await self._fetch_money_totals(
            owner_id=owner_id,
            date_from=date_from,
            date_to=date_to,
            channel_id=channel_id,
            bot_id=bot_id,
            currency=active_currency,
        )

        published_count = await self._count_ads_by_status(
            owner_id=owner_id,
            statuses=[DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS],
            date_from=date_from,
            date_to=date_to,
        )
        scheduled_count = await self._count_ads_by_status(
            owner_id=owner_id,
            statuses=[DBPublicationStatus.SCHEDULED],
            date_from=date_from,
            date_to=date_to,
        )

        income_total = Decimal(money["income"])
        expense_total = Decimal(money["expense"])
        return AdRevenueStats(
            income_total=income_total,
            expense_total=expense_total,
            profit=income_total - expense_total,
            income_count=money["income_count"],
            expense_count=money["expense_count"],
            published_ads_count=published_count,
            scheduled_ads_count=scheduled_count,
            currency=active_currency,
            currencies=currencies,
        )

    async def _fetch_money_totals(
        self,
        *,
        owner_id: int,
        date_from: Optional[date],
        date_to: Optional[date],
        channel_id: Optional[int],
        bot_id: Optional[int],
        currency: str,
    ) -> dict:
        conditions = [
            AdRevenue.owner_id == owner_id,
            AdRevenue.currency == currency,
        ]
        if date_from is not None:
            conditions.append(AdRevenue.revenue_date >= date_from)
        if date_to is not None:
            conditions.append(AdRevenue.revenue_date <= date_to)
        if channel_id is not None:
            conditions.append(AdRevenue.channel_id == channel_id)
        if bot_id is not None:
            conditions.append(AdRevenue.bot_id == bot_id)

        income_filter = case((AdRevenue.type == AdRevenueType.INCOME.value, AdRevenue.amount), else_=0)
        expense_filter = case((AdRevenue.type == AdRevenueType.EXPENSE.value, AdRevenue.amount), else_=0)
        income_count_filter = case((AdRevenue.type == AdRevenueType.INCOME.value, 1), else_=0)
        expense_count_filter = case((AdRevenue.type == AdRevenueType.EXPENSE.value, 1), else_=0)

        row = (await self.db.execute(
            select(
                func.coalesce(func.sum(income_filter), 0),
                func.coalesce(func.sum(expense_filter), 0),
                func.coalesce(func.sum(income_count_filter), 0),
                func.coalesce(func.sum(expense_count_filter), 0),
            ).where(*conditions)
        )).one()

        return {
            "income": row[0],
            "expense": row[1],
            "income_count": int(row[2]),
            "expense_count": int(row[3]),
        }

    async def _count_ads_by_status(
        self,
        *,
        owner_id: int,
        statuses: List[DBPublicationStatus],
        date_from: Optional[date],
        date_to: Optional[date],
    ) -> int:
        conditions = [
            Publication.owner_id == owner_id,
            Publication.is_ad.is_(True),
            Publication.status.in_(statuses),
        ]
        if date_from is not None:
            conditions.append(func.date(Publication.scheduled_time) >= date_from)
        if date_to is not None:
            conditions.append(func.date(Publication.scheduled_time) <= date_to)
        result = await self.db.execute(
            select(func.count()).select_from(Publication).where(*conditions)
        )
        return int(result.scalar_one())

    async def _fetch_currencies(self, owner_id: int) -> List[str]:
        result = await self.db.execute(
            select(AdRevenue.currency)
            .where(AdRevenue.owner_id == owner_id)
            .group_by(AdRevenue.currency)
            .order_by(AdRevenue.currency.asc())
        )
        return [row[0] for row in result.all()]

    def _pick_currency(self, requested: Optional[str], available: List[str]) -> str:
        if requested:
            return requested
        if available:
            return available[0]
        return "RUB"
