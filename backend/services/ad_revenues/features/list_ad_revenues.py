from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Literal, Optional, Set, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.ad_revenues import AdRevenue
from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
    TelegramMessage,
)
from backend.schemas.ad_revenues.ad_revenue import AdRevenuePlacement, AdRevenueResponse
from backend.schemas.ad_revenues.enums import AdRevenueType


SortKey = Literal["date", "price", "type", "comments", "views", "clicks", "reactions"]
SortDir = Literal["asc", "desc"]
StatusFilter = Literal["scheduled", "published"]


@dataclass(frozen=True)
class RevenueMetrics:
    views: int = 0
    forwards: int = 0
    reactions: int = 0
    comments: int = 0
    clicks: int = 0


class ListAdRevenues:
    """Список рекламных записей пользователя с агрегатами метрик."""

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
        sort_by: Optional[SortKey] = None,
        sort_dir: SortDir = "desc",
        status: Optional[StatusFilter] = None,
        currency: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AdRevenueResponse], int]:
        conditions = build_conditions(
            owner_id, type_, channel_id, bot_id, date_from, date_to, currency,
        )
        status_clause = status_clause_for(status) if status else None

        revenue_responses = await self.fetch_ad_revenue_responses(conditions, status_clause)
        linked_publication_ids = {
            r.publication_id for r in revenue_responses if r.publication_id is not None
        }
        publication_responses = await self.fetch_publication_responses(
            owner_id=owner_id,
            type_=type_,
            channel_id=channel_id,
            date_from=date_from,
            date_to=date_to,
            currency=currency,
            status=status,
            exclude_publication_ids=linked_publication_ids,
        )

        merged = revenue_responses + publication_responses
        merged.sort(key=sort_key(sort_by), reverse=sort_dir == "desc")

        total = len(merged)
        paged = merged[offset : offset + limit]
        return paged, total

    async def fetch_ad_revenue_responses(
        self,
        conditions: list,
        status_clause,
    ) -> List[AdRevenueResponse]:
        stmt = (
            select(AdRevenue)
            .where(*conditions)
            .options(
                selectinload(AdRevenue.publication)
                .selectinload(Publication.telegram_messages)
                .selectinload(TelegramMessage.channel),
            )
        )
        if status_clause is not None:
            stmt = stmt.join(Publication, Publication.id == AdRevenue.publication_id).where(status_clause)
        items = list((await self.db.execute(stmt)).unique().scalars().all())
        return [build_response(item) for item in items]

    async def fetch_publication_responses(
        self,
        owner_id: int,
        type_: Optional[AdRevenueType],
        channel_id: Optional[int],
        date_from: Optional[date],
        date_to: Optional[date],
        currency: Optional[str],
        status: Optional[StatusFilter],
        exclude_publication_ids: Set[int],
    ) -> List[AdRevenueResponse]:
        if type_ == AdRevenueType.EXPENSE:
            return []

        conds = [Publication.owner_id == owner_id, Publication.is_ad.is_(True)]
        if exclude_publication_ids:
            conds.append(~Publication.id.in_(exclude_publication_ids))
        if date_from is not None:
            conds.append(func.date(Publication.scheduled_time) >= date_from)
        if date_to is not None:
            conds.append(func.date(Publication.scheduled_time) <= date_to)
        if currency:
            conds.append(Publication.ad_currency == currency)
        if status == "scheduled":
            conds.append(Publication.status == DBPublicationStatus.SCHEDULED)
        elif status == "published":
            conds.append(
                Publication.status.in_(
                    [DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]
                )
            )

        stmt = (
            select(Publication)
            .where(*conds)
            .options(
                selectinload(Publication.telegram_messages).selectinload(TelegramMessage.channel),
                selectinload(Publication.channels),
            )
        )
        if channel_id is not None:
            stmt = stmt.where(Publication.channels.any(id=channel_id))

        pubs = list((await self.db.execute(stmt)).unique().scalars().all())
        return [build_publication_response(p) for p in pubs]


def build_conditions(
    owner_id: int,
    type_: Optional[AdRevenueType],
    channel_id: Optional[int],
    bot_id: Optional[int],
    date_from: Optional[date],
    date_to: Optional[date],
    currency: Optional[str],
) -> list:
    conds = [AdRevenue.owner_id == owner_id]
    if type_ is not None:
        conds.append(AdRevenue.type == type_.value)
    if channel_id is not None:
        conds.append(AdRevenue.channel_id == channel_id)
    if bot_id is not None:
        conds.append(AdRevenue.bot_id == bot_id)
    if date_from is not None:
        conds.append(AdRevenue.revenue_date >= date_from)
    if date_to is not None:
        conds.append(AdRevenue.revenue_date <= date_to)
    if currency:
        conds.append(AdRevenue.currency == currency)
    return conds


def status_clause_for(status: StatusFilter):
    if status == "scheduled":
        return Publication.status == DBPublicationStatus.SCHEDULED
    return Publication.status.in_(
        [DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]
    )


SORT_GETTERS = {
    "price": lambda r: (r.amount or Decimal(0), r.id),
    "type": lambda r: (r.type.value, r.id),
    "comments": lambda r: (r.comments_count, r.id),
    "views": lambda r: (r.views_count, r.id),
    "clicks": lambda r: (r.clicks_count, r.id),
    "reactions": lambda r: (r.reactions_count, r.id),
}


def sort_key(sort_by: Optional[SortKey]):
    return SORT_GETTERS.get(sort_by, lambda r: (r.revenue_date, r.id))


def collect_metrics(publication: Optional[Publication]) -> RevenueMetrics:
    if publication is None:
        return RevenueMetrics()
    messages = publication.telegram_messages or []
    if not messages:
        return RevenueMetrics()
    return RevenueMetrics(
        views=sum((m.views_count or 0) for m in messages),
        forwards=sum((m.forwards_count or 0) for m in messages),
        reactions=sum((m.reactions_count or 0) for m in messages),
        comments=sum((m.comments_count or 0) for m in messages),
        clicks=sum((m.clicks_count or 0) for m in messages),
    )


def message_link(username: Optional[str], message_id: Optional[int]) -> Optional[str]:
    if not username or not message_id:
        return None
    return f"https://t.me/{username.lstrip('@')}/{message_id}"


def collect_placements(item: AdRevenue) -> List[AdRevenuePlacement]:
    publication: Optional[Publication] = getattr(item, "publication", None)
    if publication is not None:
        messages = publication.telegram_messages or []
        if messages:
            return [
                AdRevenuePlacement(
                    channel_id=m.channel_id,
                    title=getattr(m.channel, "title", "") if m.channel else "",
                    username=getattr(m.channel, "username", None) if m.channel else None,
                    photo_url=getattr(m.channel, "photo_url", None) if m.channel else None,
                    post_link=message_link(
                        getattr(m.channel, "username", None) if m.channel else None,
                        m.telegram_message_id,
                    ),
                )
                for m in messages
            ]
    username = (item.channel_username or "").lstrip("@") or None
    if not (item.channel_id or username):
        return []
    return [
        AdRevenuePlacement(
            channel_id=item.channel_id or 0,
            title=username or "",
            username=username,
            photo_url=None,
            post_link=item.post_link,
        )
    ]


def build_publication_response(pub: Publication) -> AdRevenueResponse:
    messages = pub.telegram_messages or []
    placements = []
    if messages:
        for m in messages:
            channel = m.channel
            username = getattr(channel, "username", None) if channel else None
            placements.append(
                AdRevenuePlacement(
                    channel_id=m.channel_id,
                    title=getattr(channel, "title", "") if channel else "",
                    username=username,
                    photo_url=getattr(channel, "photo_url", None) if channel else None,
                    post_link=message_link(username, m.telegram_message_id),
                )
            )
    elif pub.channels:
        for ch in pub.channels:
            placements.append(
                AdRevenuePlacement(
                    channel_id=ch.id,
                    title=ch.title,
                    username=ch.username,
                    photo_url=ch.photo_url,
                    post_link=None,
                )
            )

    metrics = collect_metrics(pub)
    fallback_link = placements[0].post_link if placements else None
    revenue_date = pub.scheduled_time.date() if pub.scheduled_time else datetime.now(timezone.utc).date()

    return AdRevenueResponse(
        id=-pub.id,
        owner_id=pub.owner_id,
        type=AdRevenueType.INCOME,
        buyer=pub.ad_buyer,
        amount=pub.ad_amount or Decimal(0),
        currency=pub.ad_currency or "RUB",
        revenue_date=revenue_date,
        note=pub.ad_note,
        publication_id=pub.id,
        channel_id=None,
        bot_id=None,
        created_at=pub.created_at or datetime.now(timezone.utc),
        updated_at=pub.updated_at or datetime.now(timezone.utc),
        channel_username=placements[0].username if placements else None,
        post_link=fallback_link,
        is_pinned=bool(pub.pin_message),
        is_auto_delete=bool(pub.auto_delete_hours or pub.auto_delete_seconds),
        is_repeating=pub.repeat_interval != DBRepeatInterval.NEVER if pub.repeat_interval else False,
        views_count=metrics.views,
        forwards_count=metrics.forwards,
        reactions_count=metrics.reactions,
        comments_count=metrics.comments,
        clicks_count=metrics.clicks,
        placements=placements,
        publication_status=pub.status.value if pub.status else None,
    )


def build_response(item: AdRevenue) -> AdRevenueResponse:
    publication: Optional[Publication] = getattr(item, "publication", None)
    metrics = collect_metrics(publication)
    placements = collect_placements(item)
    fallback_link = placements[0].post_link if placements else None
    pub_repeating = (
        publication is not None
        and publication.repeat_interval is not None
        and publication.repeat_interval != DBRepeatInterval.NEVER
    )
    pub_auto_delete = publication is not None and bool(
        publication.auto_delete_hours or publication.auto_delete_seconds
    )
    pub_pinned = publication is not None and bool(publication.pin_message)
    return AdRevenueResponse(
        id=item.id,
        owner_id=item.owner_id,
        type=AdRevenueType(item.type),
        buyer=item.buyer,
        amount=item.amount,
        currency=item.currency,
        revenue_date=item.revenue_date,
        note=item.note,
        publication_id=item.publication_id,
        channel_id=item.channel_id,
        bot_id=item.bot_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
        channel_username=item.channel_username,
        post_link=item.post_link or fallback_link,
        is_pinned=item.is_pinned or pub_pinned,
        is_auto_delete=item.is_auto_delete or pub_auto_delete,
        is_repeating=item.is_repeating or pub_repeating,
        views_count=metrics.views,
        forwards_count=metrics.forwards,
        reactions_count=metrics.reactions,
        comments_count=metrics.comments,
        clicks_count=metrics.clicks,
        placements=placements,
        publication_status=publication.status.value if publication and publication.status else None,
    )
