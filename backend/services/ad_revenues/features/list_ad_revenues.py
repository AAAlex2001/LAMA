from datetime import date
from typing import List, Optional, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue
from backend.schemas.ad_revenues.enums import AdRevenueType


class ListAdRevenues:
    """Список рекламных записей владельца с фильтрами и пагинацией."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        type_: Optional[AdRevenueType] = None,
        channel_id: Optional[int] = None,
        bot_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AdRevenue], int]:
        conditions = [AdRevenue.owner_id == owner_id]
        if type_ is not None:
            conditions.append(AdRevenue.type == type_.value)
        if channel_id is not None:
            conditions.append(AdRevenue.channel_id == channel_id)
        if bot_id is not None:
            conditions.append(AdRevenue.bot_id == bot_id)
        if date_from is not None:
            conditions.append(AdRevenue.revenue_date >= date_from)
        if date_to is not None:
            conditions.append(AdRevenue.revenue_date <= date_to)

        items_stmt = (
            select(AdRevenue)
            .where(*conditions)
            .order_by(desc(AdRevenue.revenue_date), desc(AdRevenue.id))
            .limit(limit)
            .offset(offset)
        )
        total_stmt = select(func.count()).select_from(AdRevenue).where(*conditions)

        items = (await self.db.execute(items_stmt)).scalars().all()
        total = (await self.db.execute(total_stmt)).scalar_one()
        return list(items), total
