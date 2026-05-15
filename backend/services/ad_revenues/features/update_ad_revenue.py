from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue
from backend.schemas.ad_revenues.ad_revenue import AdRevenueUpdate


class UpdateAdRevenue:
    """Обновить запись. Меняются только те поля, которые пришли в payload."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, ad_revenue: AdRevenue, payload: AdRevenueUpdate) -> AdRevenue:
        data = payload.model_dump(exclude_unset=True)
        if "type" in data and data["type"] is not None:
            data["type"] = data["type"].value
        for field, value in data.items():
            setattr(ad_revenue, field, value)
        await self.db.flush()
        await self.db.refresh(ad_revenue)
        return ad_revenue
