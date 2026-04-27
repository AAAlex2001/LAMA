"""Постраничный список событий инбокса с фильтрами."""

from dataclasses import dataclass
from typing import List, Optional

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventStatus, EventType, InboxCategory, SortDir

# Системные = ошибки/вступления/ссылки/баны (НЕ триггеры/команды/авто-ответы).
SYSTEM_EVENT_TYPES = (
    EventType.SYSTEM_NOTIFICATION,
    EventType.SYSTEM_UPDATE,
    EventType.CHANNEL_JOIN_REQUEST,
    EventType.CHANNEL_LINK_JOIN,
    EventType.CHANNEL_BAN,
    EventType.BOT_ERROR,
)

AUTOMATION_EVENT_TYPES = (
    EventType.BOT_COMMAND,
    EventType.SYSTEM_TRIGGER,
    EventType.SYSTEM_AUTOREPLY,
)


@dataclass(frozen=True, slots=True)
class BotMeta:
    """Минимальные метаданные бота для рендера в инбоксе."""
    tg_bot_username: str
    tg_bot_name: str


class ListInboxEvents:
    """Список событий пользователя + общее число + bot-метаданные одним запросом."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        category: Optional[InboxCategory] = None,
        status: Optional[EventStatus] = None,
        bot_ids: Optional[List[int]] = None,
        channel_ids: Optional[List[int]] = None,
        include_system: Optional[bool] = None,
        type_auto_replies: Optional[bool] = None,
        type_triggers: Optional[bool] = None,
        type_commands: Optional[bool] = None,
        event_types: Optional[List[EventType]] = None,
        sort_dir: SortDir = SortDir.NEW_FIRST,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[List[InboxEvent], int, dict[int, BotMeta]]:
        filters = build_filters(owner_id, category, status, event_types)

        source_filter = build_source_or(bot_ids, channel_ids, include_system)
        if source_filter is not None:
            filters.append(source_filter)

        type_filter = build_type_or(type_auto_replies, type_triggers, type_commands)
        if type_filter is not None:
            filters.append(type_filter)

        items = await fetch_events(self.db, filters, sort_dir, limit, offset)
        total = await count_events(self.db, filters)
        bot_map = await fetch_bot_map(self.db, items)

        return items, total, bot_map


# ──────────────────────────────────────────────────────────────────────
# Фильтры — каждый в своей мини-функции
# ──────────────────────────────────────────────────────────────────────


def build_filters(
    owner_id: int,
    category: Optional[InboxCategory],
    status: Optional[EventStatus],
    event_types: Optional[List[EventType]],
) -> list:
    """Базовые фильтры: владелец + категория + статус + точечные event_types."""
    filters: list = [InboxEvent.owner_id == owner_id]

    if category:
        filters.append(InboxEvent.category == category)
        if category == InboxCategory.AUTOMATION and not event_types:
            filters.append(InboxEvent.event_type.in_(AUTOMATION_EVENT_TYPES))

    if status:
        filters.append(InboxEvent.status == status)

    if event_types:
        filters.append(InboxEvent.event_type.in_(event_types))

    return filters


def build_source_or(
    bot_ids: Optional[List[int]],
    channel_ids: Optional[List[int]],
    include_system: Optional[bool],
):
    """OR-условие по источникам: bot/channel/system. None если ни одного флага."""
    conditions = []
    if bot_ids:
        conditions.append(InboxEvent.bot_id.in_(bot_ids))
    if channel_ids:
        conditions.append(InboxEvent.channel_id.in_(channel_ids))
    if include_system is True:
        conditions.append(InboxEvent.event_type.in_(SYSTEM_EVENT_TYPES))
    if not conditions:
        return None
    return or_(*conditions)


def build_type_or(
    auto_replies: Optional[bool],
    triggers: Optional[bool],
    commands: Optional[bool],
):
    """OR-условие по флагам типов автоматизации. None если ни один не включён."""
    conditions = []
    if auto_replies is True:
        conditions.append(InboxEvent.event_type == EventType.SYSTEM_AUTOREPLY)
    if triggers is True:
        conditions.append(InboxEvent.event_type == EventType.SYSTEM_TRIGGER)
    if commands is True:
        conditions.append(InboxEvent.event_type == EventType.BOT_COMMAND)
    if not conditions:
        return None
    return or_(*conditions)


# ──────────────────────────────────────────────────────────────────────
# Запросы
# ──────────────────────────────────────────────────────────────────────


async def fetch_events(
    db: AsyncSession, filters: list, sort_dir: SortDir, limit: int, offset: int,
) -> List[InboxEvent]:
    """Страница событий с сортировкой по created_at."""
    order_expr = desc(InboxEvent.created_at) if sort_dir == SortDir.NEW_FIRST else asc(InboxEvent.created_at)
    stmt = (
        select(InboxEvent)
        .where(*filters)
        .order_by(order_expr)
        .limit(limit)
        .offset(offset)
    )
    return list((await db.execute(stmt)).scalars().all())


async def count_events(db: AsyncSession, filters: list) -> int:
    """Общее число событий под теми же фильтрами."""
    stmt = select(func.count(InboxEvent.id)).where(*filters)
    return (await db.execute(stmt)).scalar_one()


async def fetch_bot_map(
    db: AsyncSession, items: List[InboxEvent],
) -> dict[int, BotMeta]:
    """Достаёт username/name всех ботов, упомянутых в items."""
    bot_ids = {e.bot_id for e in items if e.bot_id is not None}
    if not bot_ids:
        return {}

    rows = (await db.execute(
        select(Bot.id, Bot.username, Bot.first_name).where(Bot.id.in_(bot_ids))
    )).all()
    return {
        int(bot_id): BotMeta(
            tg_bot_username=str(username) if username is not None else "",
            tg_bot_name=str(first_name) if first_name is not None else "",
        )
        for bot_id, username, first_name in rows
    }
