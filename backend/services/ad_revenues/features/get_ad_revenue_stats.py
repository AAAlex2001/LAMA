from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue
from backend.schemas.ad_revenues.ad_revenue import AdRevenueStats
from backend.schemas.ad_revenues.enums import AdRevenueType


class GetAdRevenueStats:
    """Сводная статистика рекламных доходов и расходов владельца за период."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        channel_id: Optional[int] = None,
        bot_id: Optional[int] = None,
    ) -> AdRevenueStats:
        conditions = [AdRevenue.owner_id == owner_id]
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

        income_total = Decimal(row[0])
        expense_total = Decimal(row[1])
        return AdRevenueStats(
            income_total=income_total,
            expense_total=expense_total,
            profit=income_total - expense_total,
            income_count=int(row[2]),
            expense_count=int(row[3]),
        )
