from dataclasses import dataclass
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


PUBLISHED_STATUSES = (DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS)
SCHEDULED_STATUSES = (DBPublicationStatus.SCHEDULED,)
DEFAULT_CURRENCY = "RUB"


@dataclass(frozen=True)
class MoneyTotals:
    income: Decimal
    expense: Decimal
    income_count: int
    expense_count: int


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
        currencies = await self.fetch_currencies(owner_id)
        active = currency or (currencies[0] if currencies else DEFAULT_CURRENCY)

        money = await self.fetch_money(owner_id, date_from, date_to, channel_id, bot_id, active)
        published_ads = await self.count_ads(owner_id, PUBLISHED_STATUSES, date_from, date_to)
        scheduled_ads = await self.count_ads(owner_id, SCHEDULED_STATUSES, date_from, date_to)

        return AdRevenueStats(
            income_total=money.income,
            expense_total=money.expense,
            profit=money.income - money.expense,
            income_count=money.income_count,
            expense_count=money.expense_count,
            published_ads_count=published_ads,
            scheduled_ads_count=scheduled_ads,
            currency=active,
            currencies=currencies,
        )

    async def fetch_money(
        self,
        owner_id: int,
        date_from: Optional[date],
        date_to: Optional[date],
        channel_id: Optional[int],
        bot_id: Optional[int],
        currency: str,
    ) -> MoneyTotals:
        conditions = [AdRevenue.owner_id == owner_id, AdRevenue.currency == currency]
        if date_from is not None:
            conditions.append(AdRevenue.revenue_date >= date_from)
        if date_to is not None:
            conditions.append(AdRevenue.revenue_date <= date_to)
        if channel_id is not None:
            conditions.append(AdRevenue.channel_id == channel_id)
        if bot_id is not None:
            conditions.append(AdRevenue.bot_id == bot_id)

        income_amount = case((AdRevenue.type == AdRevenueType.INCOME.value, AdRevenue.amount), else_=0)
        expense_amount = case((AdRevenue.type == AdRevenueType.EXPENSE.value, AdRevenue.amount), else_=0)
        income_one = case((AdRevenue.type == AdRevenueType.INCOME.value, 1), else_=0)
        expense_one = case((AdRevenue.type == AdRevenueType.EXPENSE.value, 1), else_=0)

        row = (await self.db.execute(
            select(
                func.coalesce(func.sum(income_amount), 0),
                func.coalesce(func.sum(expense_amount), 0),
                func.coalesce(func.sum(income_one), 0),
                func.coalesce(func.sum(expense_one), 0),
            ).where(*conditions)
        )).one()

        return MoneyTotals(
            income=Decimal(row[0]),
            expense=Decimal(row[1]),
            income_count=int(row[2]),
            expense_count=int(row[3]),
        )

    async def count_ads(
        self,
        owner_id: int,
        statuses: tuple,
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

    async def fetch_currencies(self, owner_id: int) -> List[str]:
        result = await self.db.execute(
            select(AdRevenue.currency)
            .where(AdRevenue.owner_id == owner_id)
            .group_by(AdRevenue.currency)
            .order_by(AdRevenue.currency.asc())
        )
        return [row[0] for row in result.all()]
