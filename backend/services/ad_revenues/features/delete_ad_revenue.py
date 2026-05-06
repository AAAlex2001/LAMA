from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue


class DeleteAdRevenue:
    """Удалить рекламную запись."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, ad_revenue: AdRevenue) -> None:
        await self.db.delete(ad_revenue)
        await self.db.flush()
