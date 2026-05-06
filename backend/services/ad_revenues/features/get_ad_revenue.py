from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue


class GetAdRevenue:
    """Получить рекламную запись по id владельца."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, ad_revenue_id: int, owner_id: int) -> Optional[AdRevenue]:
        result = await self.db.execute(
            select(AdRevenue).where(
                AdRevenue.id == ad_revenue_id,
                AdRevenue.owner_id == owner_id,
            )
        )
        return result.scalar_one_or_none()
