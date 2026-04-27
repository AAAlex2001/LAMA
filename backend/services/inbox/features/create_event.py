"""Создание InboxEvent в БД."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.inbox import InboxEvent
from backend.schemas.inbox.events import InboxEventCreate


class CreateInboxEvent:
    """Создаёт запись в инбоксе из Pydantic-схемы."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, data: InboxEventCreate) -> InboxEvent:
        event = InboxEvent(**data.model_dump())
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event
