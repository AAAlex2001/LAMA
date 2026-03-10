from typing import List, Optional
from sqlalchemy import select, desc, asc, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import InboxCategory, EventStatus, SortDir, EventType


# Системные = ошибки, вступления, ссылки и т.д. (НЕ триггеры/команды/авто-ответы)
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


class InboxQueryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_events(
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
    ) -> tuple[List[InboxEvent], int]:

        base = InboxEvent.owner_id == owner_id
        filters = [base]

        if category:
            filters.append(InboxEvent.category == category)
            if category == InboxCategory.AUTOMATION and not event_types:
                filters.append(InboxEvent.event_type.in_(AUTOMATION_EVENT_TYPES))

        if status:
            filters.append(InboxEvent.status == status)

        # --- Комбинированная фильтрация по источникам ---
        source_conditions = []
        if bot_ids:
            source_conditions.append(InboxEvent.bot_id.in_(bot_ids))
        if channel_ids:
            source_conditions.append(InboxEvent.channel_id.in_(channel_ids))
        if include_system is True:
            source_conditions.append(InboxEvent.event_type.in_(SYSTEM_EVENT_TYPES))
        if source_conditions:
            filters.append(or_(*source_conditions))

        # --- Фильтрация по типам автоматизации ---
        type_conditions = []
        if type_auto_replies is True:
            type_conditions.append(InboxEvent.event_type == EventType.SYSTEM_AUTOREPLY)
        if type_triggers is True:
            type_conditions.append(InboxEvent.event_type == EventType.SYSTEM_TRIGGER)
        if type_commands is True:
            type_conditions.append(InboxEvent.event_type == EventType.BOT_COMMAND)
        if type_conditions:
            filters.append(or_(*type_conditions))

        # --- Прямая фильтрация по event_types ---
        if event_types:
            filters.append(InboxEvent.event_type.in_(event_types))

        stmt = select(InboxEvent).where(*filters)
        count_stmt = select(func.count(InboxEvent.id)).where(*filters)

        if sort_dir == SortDir.NEW_FIRST:
            stmt = stmt.order_by(desc(InboxEvent.created_at))
        else:
            stmt = stmt.order_by(asc(InboxEvent.created_at))

        stmt = stmt.limit(limit).offset(offset)

        result = await self.db.execute(stmt)
        items = result.scalars().all()

        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        return list(items), total
