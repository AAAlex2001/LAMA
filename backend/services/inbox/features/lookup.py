"""Поиск события инбокса с проверкой владельца."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.inbox import InboxEvent


async def find_event_or_404(db: AsyncSession, event_id: int, owner_id: int) -> InboxEvent:
    """Событие инбокса пользователя или 404."""
    event = (await db.execute(
        select(InboxEvent).where(
            InboxEvent.id == event_id,
            InboxEvent.owner_id == owner_id,
        )
    )).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


def mark_payload_handled(event: InboxEvent) -> None:
    """Если в payload есть ключ 'handled' — выставить True (для bot_command и т.п.)."""
    payload = event.payload
    if payload and "handled" in payload:
        new_payload = dict(payload)
        new_payload["handled"] = True
        event.payload = new_payload
