from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue
from backend.models.publications import Publication


class DeleteAdRevenue:
    """Удалить рекламную запись.

    Список рекламных строк собирается из двух источников: реальные `AdRevenue`
    и публикации с `is_ad=True` (последние отдаются с отрицательным id).
    Удаление унифицировано: отрицательный id → чистим рекламные поля у публикации;
    положительный → удаляем `AdRevenue` и чистим связанную публикацию, чтобы
    она не «всплыла» обратно как синтетическая строка.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, ad_revenue_id: int, owner_id: int) -> bool:
        if ad_revenue_id < 0:
            return await self.clear_publication_ad_fields(-ad_revenue_id, owner_id)

        ad_revenue = await self.find_ad_revenue(ad_revenue_id, owner_id)
        if ad_revenue is None:
            return False

        publication_id = ad_revenue.publication_id
        await self.db.delete(ad_revenue)
        await self.db.flush()
        if publication_id is not None:
            await self.clear_publication_ad_fields(publication_id, owner_id)
        return True

    async def find_ad_revenue(self, ad_revenue_id: int, owner_id: int) -> AdRevenue | None:
        result = await self.db.execute(
            select(AdRevenue).where(
                AdRevenue.id == ad_revenue_id,
                AdRevenue.owner_id == owner_id,
            )
        )
        return result.scalar_one_or_none()

    async def clear_publication_ad_fields(self, publication_id: int, owner_id: int) -> bool:
        result = await self.db.execute(
            select(Publication).where(
                Publication.id == publication_id,
                Publication.owner_id == owner_id,
            )
        )
        publication = result.scalar_one_or_none()
        if publication is None:
            return False
        publication.is_ad = False
        publication.ad_buyer = None
        publication.ad_amount = None
        publication.ad_currency = None
        publication.ad_note = None
        await self.db.flush()
        return True
