from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.inbox import InboxEvent
from backend.schemas.inbox.events import InboxEventCreate


class InboxEventService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_event(self, data: InboxEventCreate) -> InboxEvent:
        event = InboxEvent(**data.model_dump())
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event
