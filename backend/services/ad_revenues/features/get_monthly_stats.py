from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue
from backend.models.channels import ChannelGroup
from backend.models.publications import Publication, publication_channels
from backend.schemas.ad_revenues.ad_revenue import MonthlyAdStatItem
from backend.schemas.ad_revenues.enums import AdRevenueType


@dataclass
class MonthBucket:
    income: Decimal = Decimal(0)
    expense: Decimal = Decimal(0)


class GetMonthlyAdStats:
    """12 точек (январь–декабрь) — доход и расход за каждый месяц года.

    Пустые месяцы возвращаются нулями. Используется для столбикового графика.
    Если выбран канал — учитываются только его записи.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        year: int,
        currency: Optional[str] = None,
        channel_id: Optional[int] = None,
    ) -> List[MonthlyAdStatItem]:
        buckets: Dict[int, MonthBucket] = defaultdict(MonthBucket)
        await self.aggregate_ad_revenues(buckets, owner_id, year, currency, channel_id)
        await self.aggregate_publication_income(buckets, owner_id, year, currency, channel_id)
        return [
            MonthlyAdStatItem(
                month=m,
                income=buckets[m].income,
                expense=buckets[m].expense,
            )
            for m in range(1, 13)
        ]

    async def aggregate_ad_revenues(
        self,
        buckets: Dict[int, MonthBucket],
        owner_id: int,
        year: int,
        currency: Optional[str],
        channel_id: Optional[int],
    ) -> None:
        conditions = [
            AdRevenue.owner_id == owner_id,
            AdRevenue.revenue_date >= date(year, 1, 1),
            AdRevenue.revenue_date < date(year + 1, 1, 1),
        ]
        if currency:
            conditions.append(AdRevenue.currency == currency)
        if channel_id is not None:
            # Записи могут быть привязаны либо напрямую через channel_id, либо через
            # текстовый channel_username (расходы из модалки без выбора канала).
            # Учитываем оба случая, иначе расходы канала не попадают на график.
            username = await self.fetch_channel_username(owner_id, channel_id)
            channel_match = AdRevenue.channel_id == channel_id
            if username:
                conditions.append(or_(
                    channel_match,
                    AdRevenue.channel_username.ilike(username),
                    AdRevenue.channel_username.ilike(f"@{username}"),
                ))
            else:
                conditions.append(channel_match)

        income_amount = case((AdRevenue.type == AdRevenueType.INCOME.value, AdRevenue.amount), else_=0)
        expense_amount = case((AdRevenue.type == AdRevenueType.EXPENSE.value, AdRevenue.amount), else_=0)
        month_col = func.extract("month", AdRevenue.revenue_date)

        stmt = (
            select(
                month_col,
                func.coalesce(func.sum(income_amount), 0),
                func.coalesce(func.sum(expense_amount), 0),
            )
            .where(*conditions)
            .group_by(month_col)
        )
        rows = (await self.db.execute(stmt)).all()
        for month, income, expense in rows:
            b = buckets[int(month)]
            b.income += Decimal(income)
            b.expense += Decimal(expense)

    async def fetch_channel_username(self, owner_id: int, channel_id: int) -> Optional[str]:
        stmt = (
            select(ChannelGroup.username)
            .where(ChannelGroup.owner_id == owner_id, ChannelGroup.id == channel_id)
            .limit(1)
        )
        username = (await self.db.execute(stmt)).scalar_one_or_none()
        if not username:
            return None
        return username.lstrip("@").strip() or None

    async def aggregate_publication_income(
        self,
        buckets: Dict[int, MonthBucket],
        owner_id: int,
        year: int,
        currency: Optional[str],
        channel_id: Optional[int],
    ) -> None:
        conditions = [
            Publication.owner_id == owner_id,
            Publication.is_ad.is_(True),
            Publication.ad_amount.isnot(None),
            Publication.scheduled_time.isnot(None),
            func.extract("year", Publication.scheduled_time) == year,
        ]
        if currency:
            conditions.append(Publication.ad_currency == currency)

        month_col = func.extract("month", Publication.scheduled_time)
        stmt = select(month_col, func.coalesce(func.sum(Publication.ad_amount), 0)).where(*conditions)
        if channel_id is not None:
            stmt = stmt.join(
                publication_channels,
                publication_channels.c.publication_id == Publication.id,
            ).where(publication_channels.c.channel_id == channel_id)
        stmt = stmt.group_by(month_col)

        rows = (await self.db.execute(stmt)).all()
        for month, income in rows:
            buckets[int(month)].income += Decimal(income)
