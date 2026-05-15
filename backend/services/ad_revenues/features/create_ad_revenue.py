from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue
from backend.models.channels import ChannelGroup
from backend.schemas.ad_revenues.ad_revenue import AdRevenueCreate
from backend.services.ad_revenues.features.schedule_ad_revenue_snapshots import (
    ScheduleAdRevenueSnapshots,
)


class CreateAdRevenue:
    """Создать одну запись о доходе или расходе.

    Если канал передан только username'ом — найдёт его id по таблице каналов.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, owner_id: int, payload: AdRevenueCreate) -> AdRevenue:
        channel_id = payload.channel_id
        if channel_id is None and payload.channel_username:
            channel_id = await self.resolve_channel_id(owner_id, payload.channel_username)

        ad_revenue = AdRevenue(
            owner_id=owner_id,
            type=payload.type.value,
            buyer=payload.buyer,
            amount=payload.amount,
            currency=payload.currency,
            revenue_date=payload.revenue_date,
            note=payload.note,
            publication_id=payload.publication_id,
            channel_id=channel_id,
            bot_id=payload.bot_id,
            channel_username=payload.channel_username,
            post_link=payload.post_link,
            is_pinned=payload.is_pinned,
            is_auto_delete=payload.is_auto_delete,
            is_repeating=payload.is_repeating,
        )
        self.db.add(ad_revenue)
        await self.db.flush()
        await self.db.refresh(ad_revenue)
        await ScheduleAdRevenueSnapshots(self.db).execute(ad_revenue)
        return ad_revenue

    async def resolve_channel_id(self, owner_id: int, username: str) -> Optional[int]:
        normalized = username.lstrip("@").strip().lower()
        if not normalized:
            return None
        stmt = (
            select(ChannelGroup.id)
            .where(
                ChannelGroup.owner_id == owner_id,
                ChannelGroup.username.ilike(normalized),
            )
            .limit(1)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()
