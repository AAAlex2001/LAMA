"""Принятие/отклонение заявки на вступление в канал."""

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot, TriggerType
from backend.models.channels import ChannelGroup
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventStatus
from backend.schemas.inbox.events import SpecificActionResult
from backend.services.inbox.features.fire_join_trigger import fire_join_trigger
from backend.services.inbox.features.increment_link_counter import increment_link_counter
from backend.services.inbox.features.lookup import mark_payload_handled


async def accept_join_request(
    db: AsyncSession, event: InboxEvent, client,
) -> SpecificActionResult:
    """approve_chat_join_request + member_count++ + триггер APPROVED."""
    channel = await load_channel_or_400(db, event)

    await client.approve_chat_join_request(
        chat_id=channel.telegram_id, user_id=event.tg_user_id,
    )
    finalize_join(event, "accepted")
    await db.flush()

    await increment_link_counter(db, event, channel)
    bot = await db.get(Bot, event.bot_id)
    if bot:
        await fire_join_trigger(db, bot, TriggerType.JOIN_REQUEST_APPROVED, event, channel)

    return SpecificActionResult(status="accepted")


async def reject_join_request(
    db: AsyncSession, event: InboxEvent, client,
) -> SpecificActionResult:
    """decline_chat_join_request + триггер REJECTED."""
    channel = await load_channel_or_400(db, event)

    await client.decline_chat_join_request(
        chat_id=channel.telegram_id, user_id=event.tg_user_id,
    )
    finalize_join(event, "rejected")
    await db.flush()

    bot = await db.get(Bot, event.bot_id)
    if bot:
        await fire_join_trigger(db, bot, TriggerType.JOIN_REQUEST_REJECTED, event, channel)

    return SpecificActionResult(status="rejected")


async def load_channel_or_400(db: AsyncSession, event: InboxEvent) -> ChannelGroup:
    """Достаёт канал события + проверяет наличие telegram_id и tg_user_id; иначе 404."""
    channel = await db.get(ChannelGroup, event.channel_id) if event.channel_id else None
    if not (channel and channel.telegram_id and event.tg_user_id):
        raise HTTPException(status_code=404, detail="Event not found")
    return channel


def finalize_join(event: InboxEvent, join_state: str) -> None:
    """Записывает join_state в payload, ставит статус PROCESSED, отмечает handled."""
    new_payload = dict(event.payload or {})
    new_payload["join_state"] = join_state
    event.payload = new_payload
    event.status = EventStatus.PROCESSED
    mark_payload_handled(event)
