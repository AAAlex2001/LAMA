"""Системное уведомление о блокировке пользователя — общий хелпер для bulk и specific."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EntityType, EventStatus, EventType, InboxCategory

CARRIED_KEYS = ("block_reason", "reason", "reason_source", "message_text", "trigger_names")


async def create_block_notification(db: AsyncSession, source_event: InboxEvent) -> InboxEvent:
    """Добавляет в БД событие SYSTEM_NOTIFICATION с описанием блока, копируя ключевые поля payload."""
    username = source_event.tg_username or str(source_event.tg_user_id or "unknown")
    description = f"Пользователь @{username} заблокирован"

    notification = InboxEvent(
        owner_id=source_event.owner_id,
        category=InboxCategory.SYSTEM,
        entity_type=EntityType.SYSTEM,
        event_type=EventType.SYSTEM_NOTIFICATION,
        bot_id=source_event.bot_id,
        channel_id=source_event.channel_id,
        tg_user_id=source_event.tg_user_id,
        tg_username=source_event.tg_username,
        status=EventStatus.NEW,
        description=description,
        payload=build_notification_payload(source_event),
    )
    db.add(notification)
    return notification


def build_notification_payload(source_event: InboxEvent) -> dict:
    """Берёт source_event_id и переносит выбранные ключи из исходного payload."""
    source_payload = source_event.payload if isinstance(source_event.payload, dict) else {}
    payload = {"source_event_id": source_event.id, "action": "block"}
    for key in CARRIED_KEYS:
        if key in source_payload:
            payload[key] = source_payload[key]
    return payload
