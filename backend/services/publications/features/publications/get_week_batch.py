"""Календарь на неделю/диапазон: 1 запрос на все дни + проекция повторов + бот-сообщения."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only, selectinload

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)
from backend.schemas.publications.publications import (
    BotMessageCompact,
    WeekBatchDay,
    WeekBatchResponse,
)
from backend.services.publications.features.publications.column_loaders import (
    CHANNEL_COMPACT_COLUMNS,
    PUB_COMPACT_COLUMNS,
    REPEAT_EXTRA_COLUMNS,
    TAG_COMPACT_COLUMNS,
)
from backend.services.publications.features.publications.get_bot_messages_in_range import (
    GetBotMessagesInRange,
)
from backend.services.publications.features.publications.projection import (
    make_scheduled_projection,
)
from backend.services.publications.utils.repeat_utils import (
    local_range_to_utc,
    project_repeat_occurrences,
    strip_tz,
    to_user_tz,
)


@dataclass
class PostBuckets:
    """Раскладка постов по дням + множества id для дедупа проекций повторов."""
    by_day: dict[str, list[Publication]] = field(default_factory=dict)
    ids_by_day: dict[str, set[int]] = field(default_factory=dict)


@dataclass
class BotMessageBuckets:
    """Раскладка бот-сообщений по дням."""
    by_day: dict[str, list[BotMessageCompact]] = field(default_factory=dict)


def status_filters(status: Optional[str], default_active: bool = False) -> list:
    """Конвертирует строковый статус в условие SQLAlchemy.

    `default_active=True` означает, что без явного status берутся только
    активные посты (PUBLISHED/PARTIAL_SUCCESS/SCHEDULED) — для проекций повторов.
    """
    if status == "scheduled":
        return [Publication.status == DBPublicationStatus.SCHEDULED]
    if status == "published":
        return [
            Publication.status.in_(
                [DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]
            )
        ]
    if default_active:
        return [
            Publication.status.in_(
                [
                    DBPublicationStatus.PUBLISHED,
                    DBPublicationStatus.PARTIAL_SUCCESS,
                    DBPublicationStatus.SCHEDULED,
                ]
            )
        ]
    return [Publication.status.notin_([DBPublicationStatus.DELETED])]


class GetWeekBatch:
    """Все дни диапазона за один проход: посты + проекции повторов + бот-сообщения."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        start_date: datetime,
        end_date: datetime,
        per_day: int = 20,
        tz: str = "UTC",
        is_ad: Optional[bool] = None,
        status: Optional[str] = None,
    ) -> WeekBatchResponse:
        utc_start, utc_end = local_range_to_utc(start_date, end_date, tz)

        posts = await fetch_scheduled_posts(self.db, owner_id, utc_start, utc_end, tz, is_ad, status)
        await add_repeat_projections(self.db, owner_id, start_date, end_date, posts, is_ad, status)
        # Бот-сообщения никогда не являются рекламой — при is_ad=True исключаем их.
        bots = (
            PostBuckets() if is_ad is True
            else await fetch_bot_message_buckets(self.db, owner_id, utc_start, utc_end, tz)
        )

        return WeekBatchResponse(days=build_days(posts, bots, per_day))


async def fetch_scheduled_posts(
    db: AsyncSession, owner_id: int, utc_start: datetime, utc_end: datetime, tz: str,
    is_ad: Optional[bool] = None,
    status: Optional[str] = None,
) -> PostBuckets:
    """Запланированные/опубликованные посты в окне → раскладка по дням."""
    filters = [
        Publication.owner_id == owner_id,
        Publication.scheduled_time >= utc_start,
        Publication.scheduled_time <= utc_end,
    ]
    filters.extend(status_filters(status))
    if is_ad is not None:
        filters.append(Publication.is_ad == is_ad)

    query = (
        select(Publication)
        .where(*filters)
        .options(
            load_only(*PUB_COMPACT_COLUMNS),
            selectinload(Publication.channels).load_only(*CHANNEL_COMPACT_COLUMNS),
            selectinload(Publication.tags).load_only(*TAG_COMPACT_COLUMNS),
        )
        .order_by(Publication.scheduled_time.asc(), Publication.id.asc())
    )
    rows = list((await db.execute(query)).scalars().all())

    buckets = PostBuckets()
    for post in rows:
        if not post.scheduled_time:
            continue
        day_key = to_user_tz(post.scheduled_time, tz).strftime("%Y-%m-%d")
        buckets.by_day.setdefault(day_key, []).append(post)
        buckets.ids_by_day.setdefault(day_key, set()).add(post.id)
    return buckets


async def add_repeat_projections(
    db: AsyncSession,
    owner_id: int,
    start_date: datetime,
    end_date: datetime,
    buckets: PostBuckets,
    is_ad: Optional[bool] = None,
    status: Optional[str] = None,
) -> None:
    """Добавляет проекции повторяющихся постов в дни, где их ещё нет."""
    repeating = await fetch_repeating_publications(db, owner_id, is_ad, status)

    for pub in repeating:
        for day_key, projected_time in project_repeat_occurrences(pub, start_date, end_date):
            if pub.id in buckets.ids_by_day.get(day_key, set()):
                continue
            projection = make_scheduled_projection(pub, projected_time)
            buckets.by_day.setdefault(day_key, []).append(projection)
            buckets.ids_by_day.setdefault(day_key, set()).add(pub.id)


async def fetch_repeating_publications(
    db: AsyncSession, owner_id: int, is_ad: Optional[bool] = None, status: Optional[str] = None,
) -> list[Publication]:
    """До 200 повторяющихся публикаций пользователя."""
    filters = [
        Publication.owner_id == owner_id,
        Publication.repeat_interval != DBRepeatInterval.NEVER,
    ]
    filters.extend(status_filters(status, default_active=True))
    if is_ad is not None:
        filters.append(Publication.is_ad == is_ad)

    query = (
        select(Publication)
        .where(*filters)
        .options(
            load_only(*PUB_COMPACT_COLUMNS, *REPEAT_EXTRA_COLUMNS),
            selectinload(Publication.channels).load_only(*CHANNEL_COMPACT_COLUMNS),
            selectinload(Publication.tags).load_only(*TAG_COMPACT_COLUMNS),
        )
        .limit(200)
    )
    return list((await db.execute(query)).scalars().all())


async def fetch_bot_message_buckets(
    db: AsyncSession, owner_id: int, utc_start: datetime, utc_end: datetime, tz: str,
) -> BotMessageBuckets:
    """Бот-сообщения календаря, сгруппированные по дню."""
    messages = await GetBotMessagesInRange(db).execute(owner_id, utc_start, utc_end)

    buckets = BotMessageBuckets()
    for msg in messages:
        day_key = bot_message_day_key(msg, tz)
        buckets.by_day.setdefault(day_key, []).append(msg)
    return buckets


def bot_message_day_key(msg: BotMessageCompact, tz: str) -> str:
    """День сообщения в таймзоне пользователя; fallback на naive."""
    if msg.sent_at:
        return to_user_tz(msg.sent_at, tz).strftime("%Y-%m-%d")
    return strip_tz(msg.sent_at).strftime("%Y-%m-%d")


def build_days(
    posts: PostBuckets,
    bots: BotMessageBuckets,
    per_day: int,
) -> dict[str, WeekBatchDay]:
    """Финализирует days: сортирует посты, обрезает по per_day, считает total."""
    days: dict[str, WeekBatchDay] = {}
    for day_key in set(posts.by_day) | set(bots.by_day):
        days[day_key] = build_day(posts, bots, day_key, per_day)
    return days


def build_day(
    posts: PostBuckets, bots: BotMessageBuckets, day_key: str, per_day: int,
) -> WeekBatchDay:
    """Один день: сортированный список постов + бот-сообщения + флаг has_more."""
    items = posts.by_day.get(day_key, [])
    items.sort(
        key=lambda p: strip_tz(getattr(p, "scheduled_time", None) or datetime.min),
        reverse=True,
    )
    bot_items = bots.by_day.get(day_key, [])
    return WeekBatchDay(
        items=items[:per_day],
        has_more=len(items) > per_day,
        bot_messages=bot_items,
        total=len(items) + len(bot_items),
    )
