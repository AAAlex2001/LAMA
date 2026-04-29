"""Удаление вызвавшего событие сообщения из чата."""

import logging

from aiogram.exceptions import TelegramAPIError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventStatus
from backend.schemas.inbox.events import SpecificActionResult
from backend.services.inbox.features.lookup import mark_payload_handled

logger = logging.getLogger(__name__)

GONE_ERRORS = ("message to delete not found", "message can't be deleted")


async def delete_message(
    db: AsyncSession, event: InboxEvent, client,
) -> SpecificActionResult:
    """Удаляет message_id из payload. Если уже удалено — игнорируется."""
    chat_id, msg_id = extract_message_target(event)

    try:
        await client.delete_message(chat_id=chat_id, message_id=msg_id)
    except TelegramAPIError as exc:
        if not is_gone_error(exc):
            raise
        logger.info("delete_message: сообщение %s/%s уже недоступно: %s", chat_id, msg_id, exc)

    event.status = EventStatus.PROCESSED
    mark_payload_handled(event)
    await db.flush()
    return SpecificActionResult(status="deleted")


def extract_message_target(event: InboxEvent) -> tuple[int, int]:
    """Достаёт chat_id+message_id из payload или 400."""
    payload = event.payload or {}
    chat_id = payload.get("chat_id")
    msg_id = payload.get("message_id")
    if not chat_id or not msg_id:
        logger.warning(
            "delete_message: в payload события %s отсутствует chat_id или message_id", event.id,
        )
        raise HTTPException(
            status_code=400,
            detail="Для этого события не сохранён message_id — удалить нельзя",
        )
    return chat_id, msg_id


def is_gone_error(exc: TelegramAPIError) -> bool:
    """True если сообщение уже удалено / недоступно."""
    text = str(exc).lower()
    return any(marker in text for marker in GONE_ERRORS)
