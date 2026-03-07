from typing import List, Optional
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventStatus, BulkActionType

class InboxActionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute_bulk_action(
        self, 
        owner_id: int, 
        event_ids: List[int], 
        action: BulkActionType, 
        apply_to_all: bool = False
    ) -> int:
        """Execute a bulk action on inbox events, returning rows affected."""
        
        base_where = InboxEvent.owner_id == owner_id
        if not apply_to_all:
            if not event_ids:
                return 0
            base_where = base_where & InboxEvent.id.in_(event_ids)
            
        modified_count = 0

        if action == BulkActionType.READ:
            stmt = update(InboxEvent).where(base_where).values(status=EventStatus.PROCESSED)
            res = await self.db.execute(stmt)
            modified_count = res.rowcount
            
        elif action == BulkActionType.IGNORE:
            stmt = update(InboxEvent).where(base_where).values(status=EventStatus.IGNORED)
            res = await self.db.execute(stmt)
            modified_count = res.rowcount
            
        elif action == BulkActionType.DELETE:
            stmt = delete(InboxEvent).where(base_where)
            res = await self.db.execute(stmt)
            modified_count = res.rowcount
            
        elif action in [BulkActionType.BLOCK, BulkActionType.UNBLOCK]:
            # This is complex and might apply only to specific event types
            # For now, mark as processed. Ideally this triggers bot unban API.
            # You would integrate with Bot/Channel API here.
            pass

        await self.db.commit()
        return modified_count
        
    async def create_event(self, event_data: dict) -> InboxEvent:
        """Internal method to create an inbox event from other services (webhooks, etc)"""
        event = InboxEvent(**event_data)
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def get_event(self, event_id: int, owner_id: int) -> Optional[InboxEvent]:
        result = await self.db.execute(
            select(InboxEvent).where(InboxEvent.id == event_id, InboxEvent.owner_id == owner_id)
        )
        return result.scalar_one_or_none()
