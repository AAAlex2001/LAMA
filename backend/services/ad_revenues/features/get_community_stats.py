from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Dict, List, Literal, Optional

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue
from backend.models.bots import Bot
from backend.models.channels import ChannelGroup, ChannelType
from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    publication_channels,
)
from backend.schemas.ad_revenues.ad_revenue import CommunityStatsItem
from backend.schemas.ad_revenues.enums import AdRevenueType

CommunityKind = Literal["channel", "group", "bot"]
COMMUNITY_FILTERS = {"all", "channels", "groups", "bots"}

PUBLISHED_STATUSES = (DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS)
SCHEDULED_STATUSES = (DBPublicationStatus.SCHEDULED,)
DEFAULT_CURRENCY = "RUB"


@dataclass
class ChannelTotals:
    income: Decimal = Decimal(0)
    expense: Decimal = Decimal(0)
    published: int = 0
    scheduled: int = 0


@dataclass
class BotTotals:
    income: Decimal = Decimal(0)
    expense: Decimal = Decimal(0)


class GetCommunityStats:
    """Сводка по сообществам: доходы/расходы и счётчики опубликованных/запланированных рекламных постов."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        currency: Optional[str] = None,
        kind: str = "all",
    ) -> List[CommunityStatsItem]:
        username_to_id = await self.fetch_username_index(owner_id)

        channel_totals: Dict[int, ChannelTotals] = defaultdict(ChannelTotals)
        bot_totals: Dict[int, BotTotals] = defaultdict(BotTotals)

        await self.aggregate_ad_revenues(
            channel_totals, bot_totals, username_to_id, owner_id, date_from, date_to, currency,
        )
        await self.aggregate_publication_income(
            channel_totals, owner_id, date_from, date_to, currency,
        )
        await self.aggregate_publication_counts(
            channel_totals, owner_id, date_from, date_to,
        )

        channels = await self.fetch_channels(owner_id, set(channel_totals.keys()))
        bots = await self.fetch_bots(owner_id, set(bot_totals.keys()))

        items: List[CommunityStatsItem] = []
        for ch in channels:
            t = channel_totals.get(ch.id, ChannelTotals())
            items.append(
                CommunityStatsItem(
                    id=ch.id,
                    kind="group" if ch.channel_type in (ChannelType.GROUP, ChannelType.SUPERGROUP) else "channel",
                    title=ch.title,
                    username=ch.username,
                    photo_url=ch.photo_url,
                    income=t.income,
                    expense=t.expense,
                    published_ads_count=t.published,
                    scheduled_ads_count=t.scheduled,
                )
            )
        for b in bots:
            t = bot_totals.get(b.id, BotTotals())
            items.append(
                CommunityStatsItem(
                    id=b.id,
                    kind="bot",
                    title=b.first_name or (f"@{b.username}" if b.username else "Bot"),
                    username=b.username,
                    photo_url=b.photo_url,
                    income=t.income,
                    expense=t.expense,
                    published_ads_count=0,
                    scheduled_ads_count=0,
                )
            )

        return filter_by_kind(items, kind)

    async def fetch_username_index(self, owner_id: int) -> Dict[str, int]:
        stmt = (
            select(ChannelGroup.id, ChannelGroup.username)
            .where(ChannelGroup.owner_id == owner_id, ChannelGroup.username.isnot(None))
        )
        rows = (await self.db.execute(stmt)).all()
        return {row[1].lstrip("@").lower(): row[0] for row in rows if row[1]}

    async def aggregate_ad_revenues(
        self,
        channels: Dict[int, ChannelTotals],
        bots: Dict[int, BotTotals],
        username_to_id: Dict[str, int],
        owner_id: int,
        date_from: Optional[date],
        date_to: Optional[date],
        currency: Optional[str],
    ) -> None:
        conditions = [AdRevenue.owner_id == owner_id]
        if date_from is not None:
            conditions.append(AdRevenue.revenue_date >= date_from)
        if date_to is not None:
            conditions.append(AdRevenue.revenue_date <= date_to)
        if currency:
            conditions.append(AdRevenue.currency == currency)

        income_amount = case((AdRevenue.type == AdRevenueType.INCOME.value, AdRevenue.amount), else_=0)
        expense_amount = case((AdRevenue.type == AdRevenueType.EXPENSE.value, AdRevenue.amount), else_=0)

        stmt = (
            select(
                AdRevenue.channel_id,
                AdRevenue.bot_id,
                AdRevenue.channel_username,
                func.coalesce(func.sum(income_amount), 0),
                func.coalesce(func.sum(expense_amount), 0),
            )
            .where(*conditions)
            .group_by(AdRevenue.channel_id, AdRevenue.bot_id, AdRevenue.channel_username)
        )
        rows = (await self.db.execute(stmt)).all()
        for ch_id, bot_id, ch_username, income, expense in rows:
            resolved_id = ch_id or resolve_username(ch_username, username_to_id)
            if resolved_id:
                t = channels[resolved_id]
                t.income += Decimal(income)
                t.expense += Decimal(expense)
                continue
            if bot_id:
                bt = bots[bot_id]
                bt.income += Decimal(income)
                bt.expense += Decimal(expense)

    async def aggregate_publication_income(
        self,
        channels: Dict[int, ChannelTotals],
        owner_id: int,
        date_from: Optional[date],
        date_to: Optional[date],
        currency: Optional[str],
    ) -> None:
        conditions = [
            Publication.owner_id == owner_id,
            Publication.is_ad.is_(True),
            Publication.ad_amount.isnot(None),
        ]
        if date_from is not None:
            conditions.append(func.date(Publication.scheduled_time) >= date_from)
        if date_to is not None:
            conditions.append(func.date(Publication.scheduled_time) <= date_to)
        if currency:
            conditions.append(
                or_(Publication.ad_currency == currency, Publication.ad_currency.is_(None))
            )

        stmt = (
            select(
                publication_channels.c.channel_id,
                func.coalesce(func.sum(Publication.ad_amount), 0),
            )
            .select_from(Publication)
            .join(publication_channels, publication_channels.c.publication_id == Publication.id)
            .where(*conditions)
            .group_by(publication_channels.c.channel_id)
        )
        rows = (await self.db.execute(stmt)).all()
        for ch_id, income in rows:
            channels[int(ch_id)].income += Decimal(income)

    async def aggregate_publication_counts(
        self,
        channels: Dict[int, ChannelTotals],
        owner_id: int,
        date_from: Optional[date],
        date_to: Optional[date],
    ) -> None:
        conditions = [Publication.owner_id == owner_id, Publication.is_ad.is_(True)]
        if date_from is not None:
            conditions.append(func.date(Publication.scheduled_time) >= date_from)
        if date_to is not None:
            conditions.append(func.date(Publication.scheduled_time) <= date_to)

        published_one = case((Publication.status.in_(PUBLISHED_STATUSES), 1), else_=0)
        scheduled_one = case((Publication.status.in_(SCHEDULED_STATUSES), 1), else_=0)

        stmt = (
            select(
                publication_channels.c.channel_id,
                func.coalesce(func.sum(published_one), 0),
                func.coalesce(func.sum(scheduled_one), 0),
            )
            .select_from(Publication)
            .join(publication_channels, publication_channels.c.publication_id == Publication.id)
            .where(*conditions)
            .group_by(publication_channels.c.channel_id)
        )
        rows = (await self.db.execute(stmt)).all()
        for ch_id, published, scheduled in rows:
            t = channels[int(ch_id)]
            t.published += int(published)
            t.scheduled += int(scheduled)

    async def fetch_channels(self, owner_id: int, ids: set[int]) -> List[ChannelGroup]:
        if not ids:
            return []
        stmt = (
            select(ChannelGroup)
            .where(ChannelGroup.owner_id == owner_id, ChannelGroup.id.in_(ids))
            .order_by(ChannelGroup.title.asc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def fetch_bots(self, owner_id: int, ids: set[int]) -> List[Bot]:
        if not ids:
            return []
        stmt = (
            select(Bot)
            .where(Bot.owner_id == owner_id, Bot.id.in_(ids))
            .order_by(Bot.first_name.asc(), Bot.username.asc())
        )
        return list((await self.db.execute(stmt)).scalars().all())


def resolve_username(value: Optional[str], index: Dict[str, int]) -> Optional[int]:
    if not value:
        return None
    return index.get(value.lstrip("@").lower())


def filter_by_kind(items: List[CommunityStatsItem], kind: str) -> List[CommunityStatsItem]:
    if kind == "channels":
        return [i for i in items if i.kind == "channel"]
    if kind == "groups":
        return [i for i in items if i.kind == "group"]
    if kind == "bots":
        return [i for i in items if i.kind == "bot"]
    return items
