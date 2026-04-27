"""Блокировка пользователя: DM-чат или канал."""

import logging

from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.models.direct import DirectChat
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventStatus
from backend.schemas.inbox.events import SpecificActionResult
from backend.services.inbox.features.create_block_notification import create_block_notification
from backend.services.inbox.features.lookup import mark_payload_handled

logger = logging.getLogger(__name__)


async def block_user(
    db: AsyncSession, event: InboxEvent, client,
) -> SpecificActionResult:
    """DM → DirectChat.is_blocked=True. Канал → ban_chat_member. Везде → status=BANNED + notification."""
    if not event.channel_id:
        return await block_dm(db, event)

    channel = await db.get(ChannelGroup, event.channel_id)
    if not (channel and channel.telegram_id and event.tg_user_id):
        raise HTTPException(status_code=404, detail="Event not found")

    if str(channel.telegram_id).startswith("-"):
        await ban_in_channel(client, channel, event.tg_user_id)

    event.status = EventStatus.BANNED
    await create_block_notification(db, event)
    mark_payload_handled(event)
    await db.flush()
    return SpecificActionResult(status="blocked")


async def block_dm(db: AsyncSession, event: InboxEvent) -> SpecificActionResult:
    """Установить is_blocked=True у DirectChat + создать notification."""
    dm_chat_id = (event.payload or {}).get("chat_id")
    if dm_chat_id and event.bot_id:
        await db.execute(
            update(DirectChat)
            .where(DirectChat.bot_id == event.bot_id, DirectChat.tg_chat_id == dm_chat_id)
            .values(is_blocked=True)
        )
    event.status = EventStatus.BANNED
    await create_block_notification(db, event)
    mark_payload_handled(event)
    await db.flush()
    return SpecificActionResult(status="blocked")


async def ban_in_channel(client, channel: ChannelGroup, user_id: int) -> None:
    """ban_chat_member; ошибка глушится с логом (статус всё равно ставим BANNED)."""
    try:
        await client.ban_chat_member(chat_id=channel.telegram_id, user_id=user_id)
    except Exception as exc:
        logger.error("Не удалось забанить пользователя в канале %s: %s", channel.telegram_id, exc)
