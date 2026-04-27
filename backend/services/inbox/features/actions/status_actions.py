"""Простые действия без вызовов Telegram: меняют только status (+ payload.handled)."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventStatus
from backend.schemas.inbox.events import SpecificActionResult
from backend.services.inbox.features.lookup import mark_payload_handled


async def mark_resolved(db: AsyncSession, event: InboxEvent) -> SpecificActionResult:
    """status → PROCESSED."""
    event.status = EventStatus.PROCESSED
    mark_payload_handled(event)
    await db.flush()
    return SpecificActionResult(status="resolved")


async def ignore_event(db: AsyncSession, event: InboxEvent) -> SpecificActionResult:
    """status → IGNORED."""
    event.status = EventStatus.IGNORED
    mark_payload_handled(event)
    await db.flush()
    return SpecificActionResult(status="ignored")


async def reply(db: AsyncSession, event: InboxEvent) -> SpecificActionResult:
    """status → PROCESSED + возвращает данные для перехода в Direct-чат."""
    event.status = EventStatus.PROCESSED
    mark_payload_handled(event)
    await db.flush()
    return SpecificActionResult(
        status="reply",
        bot_id=event.bot_id,
        tg_user_id=event.tg_user_id,
        chat_id=(event.payload or {}).get("chat_id"),
        message_id=(event.payload or {}).get("message_id"),
    )
