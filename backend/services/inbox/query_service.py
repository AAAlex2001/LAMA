from typing import List, Optional
from sqlalchemy import select, desc, asc, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, SortDir, EventType


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
        entity_type: Optional[EntityType] = None,
        entity_ids: Optional[List[int]] = None,
        event_types: Optional[List[EventType]] = None,
        sort_dir: SortDir = SortDir.NEW_FIRST,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[List[InboxEvent], int]:
        
        stmt = select(InboxEvent).where(InboxEvent.owner_id == owner_id)
        count_stmt = select(func.count(InboxEvent.id)).where(InboxEvent.owner_id == owner_id)

        # Filters
        if category:
            stmt = stmt.where(InboxEvent.category == category)
            count_stmt = count_stmt.where(InboxEvent.category == category)

            if category == InboxCategory.AUTOMATION and not event_types:
                stmt = stmt.where(InboxEvent.event_type.in_(AUTOMATION_EVENT_TYPES))
                count_stmt = count_stmt.where(InboxEvent.event_type.in_(AUTOMATION_EVENT_TYPES))
            
        if status:
            stmt = stmt.where(InboxEvent.status == status)
            count_stmt = count_stmt.where(InboxEvent.status == status)
            
        if entity_type:
            stmt = stmt.where(InboxEvent.entity_type == entity_type)
            count_stmt = count_stmt.where(InboxEvent.entity_type == entity_type)
            
        if entity_ids is not None and len(entity_ids) > 0:
            if entity_type == EntityType.BOT:
                stmt = stmt.where(InboxEvent.bot_id.in_(entity_ids))
                count_stmt = count_stmt.where(InboxEvent.bot_id.in_(entity_ids))
            elif entity_type == EntityType.CHANNEL:
                stmt = stmt.where(InboxEvent.channel_id.in_(entity_ids))
                count_stmt = count_stmt.where(InboxEvent.channel_id.in_(entity_ids))
                
        if event_types and len(event_types) > 0:
            stmt = stmt.where(InboxEvent.event_type.in_(event_types))
            count_stmt = count_stmt.where(InboxEvent.event_type.in_(event_types))

        # Sort
        if sort_dir == SortDir.NEW_FIRST:
            stmt = stmt.order_by(desc(InboxEvent.created_at))
        else:
            stmt = stmt.order_by(asc(InboxEvent.created_at))

        # Pagination
        stmt = stmt.limit(limit).offset(offset)

        result = await self.db.execute(stmt)
        items = result.scalars().all()

        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        return list(items), total
