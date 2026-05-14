"""Список рекламных записей с агрегатами метрик и сортировкой."""

from datetime import date
from typing import List, Literal, Optional, Tuple

from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.ad_revenues import AdRevenue
from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    TelegramMessage,
)
from backend.schemas.ad_revenues.enums import AdRevenueType


SortKey = Literal["date", "price", "type", "comments", "views", "clicks", "reactions"]
SortDir = Literal["asc", "desc"]
StatusFilter = Literal["scheduled", "published"]


class ListAdRevenues:
    """Список рекламных записей владельца + агрегаты метрик из telegram_messages."""

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
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[dict], int]:
        items, total = await self._fetch_revenues(
            owner_id=owner_id,
            type_=type_,
            channel_id=channel_id,
            bot_id=bot_id,
            date_from=date_from,
            date_to=date_to,
            status=status,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )
        enriched = [enrich_revenue(item) for item in items]
        # Метрики хранятся на telegram_messages — нет смысла сортировать в SQL.
        if sort_by in {"comments", "views", "clicks", "reactions"}:
            enriched.sort(
                key=lambda r: r[f"{sort_by}_count"],
                reverse=sort_dir == "desc",
            )
        return enriched, total

    async def _fetch_revenues(
        self,
        *,
        owner_id: int,
        type_: Optional[AdRevenueType],
        channel_id: Optional[int],
        bot_id: Optional[int],
        date_from: Optional[date],
        date_to: Optional[date],
        status: Optional[StatusFilter],
        limit: int,
        offset: int,
        sort_by: Optional[SortKey],
        sort_dir: SortDir,
    ) -> Tuple[List[AdRevenue], int]:
        conditions = base_conditions(owner_id, type_, channel_id, bot_id, date_from, date_to)

        items_stmt = (
            select(AdRevenue)
            .where(*conditions)
            .options(
                selectinload(AdRevenue.publication)
                .selectinload(Publication.telegram_messages)
                .selectinload(TelegramMessage.channel),
            )
        )
        total_stmt = select(func.count()).select_from(AdRevenue).where(*conditions)

        if status is not None:
            items_stmt = items_stmt.join(Publication, Publication.id == AdRevenue.publication_id)
            total_stmt = total_stmt.join(Publication, Publication.id == AdRevenue.publication_id)
            status_clause = status_clause_for(status)
            items_stmt = items_stmt.where(status_clause)
            total_stmt = total_stmt.where(status_clause)

        items_stmt = apply_order(items_stmt, sort_by, sort_dir).limit(limit).offset(offset)

        items = list((await self.db.execute(items_stmt)).unique().scalars().all())
        total = (await self.db.execute(total_stmt)).scalar_one()
        return items, total


def base_conditions(
    owner_id: int,
    type_: Optional[AdRevenueType],
    channel_id: Optional[int],
    bot_id: Optional[int],
    date_from: Optional[date],
    date_to: Optional[date],
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
    return conds


def status_clause_for(status: StatusFilter):
    if status == "scheduled":
        return Publication.status == DBPublicationStatus.SCHEDULED
    return Publication.status.in_(
        [DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]
    )


def apply_order(stmt, sort_by: Optional[SortKey], sort_dir: SortDir):
    direction = desc if sort_dir == "desc" else asc
    if sort_by == "price":
        return stmt.order_by(direction(AdRevenue.amount), direction(AdRevenue.id))
    if sort_by == "type":
        return stmt.order_by(direction(AdRevenue.type), direction(AdRevenue.id))
    return stmt.order_by(direction(AdRevenue.revenue_date), direction(AdRevenue.id))


def enrich_revenue(item: AdRevenue) -> dict:
    """AdRevenue + связанная публикация → словарь для AdRevenueResponse."""
    publication: Optional[Publication] = getattr(item, "publication", None)
    metrics = collect_metrics(publication)
    return {
        "id": item.id,
        "owner_id": item.owner_id,
        "type": item.type,
        "buyer": item.buyer,
        "amount": item.amount,
        "currency": item.currency,
        "revenue_date": item.revenue_date,
        "note": item.note,
        "publication_id": item.publication_id,
        "channel_id": item.channel_id,
        "bot_id": item.bot_id,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "views_count": metrics["views"],
        "forwards_count": metrics["forwards"],
        "reactions_count": metrics["reactions"],
        "comments_count": metrics["comments"],
        "clicks_count": metrics["clicks"],
        "post_link": item.post_link or build_post_link(publication),
        "channel_username": item.channel_username,
        "is_pinned": item.is_pinned,
        "is_auto_delete": item.is_auto_delete,
        "is_repeating": item.is_repeating,
    }


def collect_metrics(publication: Optional[Publication]) -> dict:
    zero = {"views": 0, "forwards": 0, "reactions": 0, "comments": 0, "clicks": 0}
    if publication is None:
        return zero
    messages = publication.telegram_messages or []
    if not messages:
        return zero
    return {
        "views": sum((m.views_count or 0) for m in messages),
        "forwards": sum((m.forwards_count or 0) for m in messages),
        "reactions": sum((m.reactions_count or 0) for m in messages),
        "comments": sum((m.comments_count or 0) for m in messages),
        "clicks": sum((m.clicks_count or 0) for m in messages),
    }


def build_post_link(publication: Optional[Publication]) -> Optional[str]:
    """`https://t.me/{username}/{message_id}` для первого опубликованного сообщения."""
    if publication is None:
        return None
    messages = publication.telegram_messages or []
    if not messages:
        return None
    first = messages[0]
    channel = first.channel
    username = getattr(channel, "username", None)
    if not username:
        return None
    return f"https://t.me/{username.lstrip('@')}/{first.telegram_message_id}"
