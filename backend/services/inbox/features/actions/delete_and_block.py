"""Удаление сообщения + блокировка пользователя одной операцией."""

import logging

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


async def delete_and_block(
    db: AsyncSession, event: InboxEvent, client,
) -> SpecificActionResult:
    """1) Удаляет TG-сообщение. 2) Банит в канале или DM. 3) Notification."""
    payload = event.payload or {}
    msg_chat_id = payload.get("chat_id")
    msg_id = payload.get("message_id")

    await try_delete_message(client, msg_chat_id, msg_id)

    if event.channel_id:
        await try_ban_in_channel(db, event, client)
    elif msg_chat_id and event.bot_id:
        await block_dm_chat(db, event.bot_id, msg_chat_id)

    event.status = EventStatus.BANNED
    await create_block_notification(db, event)
    mark_payload_handled(event)
    await db.flush()
    return SpecificActionResult(status="deleted_and_blocked")


async def try_delete_message(client, chat_id, message_id) -> None:
    """Удалить сообщение если есть chat_id+message_id; ошибки глушим."""
    if not (chat_id and message_id):
        return
    try:
        await client.delete_message(chat_id=chat_id, message_id=message_id)
    except Exception as exc:
        logger.warning("delete_and_block: не удалось удалить сообщение: %s", exc)


async def try_ban_in_channel(db: AsyncSession, event: InboxEvent, client) -> None:
    """Бан в канале события; пропустить если канал/юзер невалиден."""
    channel = await db.get(ChannelGroup, event.channel_id)
    if not (channel and channel.telegram_id and event.tg_user_id):
        return
    if not str(channel.telegram_id).startswith("-"):
        return
    try:
        await client.ban_chat_member(chat_id=channel.telegram_id, user_id=event.tg_user_id)
    except Exception as exc:
        logger.error("delete_and_block: бан не удался: %s", exc)


async def block_dm_chat(db: AsyncSession, bot_id: int, dm_chat_id: int) -> None:
    """is_blocked=True у DirectChat (для DM-сценария)."""
    await db.execute(
        update(DirectChat)
        .where(DirectChat.bot_id == bot_id, DirectChat.tg_chat_id == dm_chat_id)
        .values(is_blocked=True)
    )
