from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue
from backend.schemas.ad_revenues.ad_revenue import AdRevenueCreate


class CreateAdRevenue:
    """Создать рекламную запись (доход или расход)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, owner_id: int, payload: AdRevenueCreate) -> AdRevenue:
        ad_revenue = AdRevenue(
            owner_id=owner_id,
            type=payload.type.value,
            buyer=payload.buyer,
            amount=payload.amount,
            currency=payload.currency,
            revenue_date=payload.revenue_date,
            note=payload.note,
            publication_id=payload.publication_id,
            channel_id=payload.channel_id,
            bot_id=payload.bot_id,
        )
        self.db.add(ad_revenue)
        await self.db.flush()
        await self.db.refresh(ad_revenue)
        return ad_revenue
