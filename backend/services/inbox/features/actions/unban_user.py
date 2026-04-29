"""Разблокировка пользователя: DM-чат или канал (через restrict + fallback unban)."""

import logging

from aiogram.types import ChatPermissions
from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.models.direct import DirectChat
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventStatus
from backend.schemas.inbox.events import SpecificActionResult
from backend.services.inbox.features.lookup import mark_payload_handled

logger = logging.getLogger(__name__)

FULL_PERMISSIONS = ChatPermissions(
    can_send_messages=True,
    can_send_audios=True,
    can_send_documents=True,
    can_send_photos=True,
    can_send_videos=True,
    can_send_video_notes=True,
    can_send_voice_notes=True,
    can_send_polls=True,
    can_send_other_messages=True,
    can_add_web_page_previews=True,
    can_change_info=True,
    can_invite_users=True,
    can_pin_messages=True,
    can_manage_topics=True,
)


async def unban_user(
    db: AsyncSession, event: InboxEvent, client,
) -> SpecificActionResult:
    """DM-блок снимаем через DirectChat.is_blocked=False; канал — restrict с fallback на unban."""
    if not event.channel_id:
        return await unban_dm(db, event)

    channel = await db.get(ChannelGroup, event.channel_id)
    if not (channel and channel.telegram_id and event.tg_user_id):
        raise HTTPException(status_code=400, detail="Недостаточно данных для разблокировки")

    if str(channel.telegram_id).startswith("-"):
        await unban_in_channel(client, channel, event.tg_user_id)

    finalize_unban(event)
    await db.flush()
    return SpecificActionResult(status="unbanned")


async def unban_dm(db: AsyncSession, event: InboxEvent) -> SpecificActionResult:
    """Снять is_blocked у DirectChat по chat_id из payload."""
    dm_chat_id = (event.payload or {}).get("chat_id")
    if dm_chat_id and event.bot_id:
        await db.execute(
            update(DirectChat)
            .where(DirectChat.bot_id == event.bot_id, DirectChat.tg_chat_id == dm_chat_id)
            .values(is_blocked=False)
        )
    finalize_unban(event)
    await db.flush()
    return SpecificActionResult(status="unbanned")


async def unban_in_channel(client, channel: ChannelGroup, user_id: int) -> None:
    """restrict_chat_member с полными правами; при ошибке — fallback на unban_chat_member."""
    try:
        await client.restrict_chat_member(
            chat_id=channel.telegram_id, user_id=user_id, permissions=FULL_PERMISSIONS,
        )
        return
    except Exception as exc:
        logger.warning("Не удалось снять мут через restrict_chat_member, пробуем unban: %s", exc)

    try:
        await client.unban_chat_member(
            chat_id=channel.telegram_id, user_id=user_id, only_if_banned=True,
        )
    except Exception as exc:
        logger.error("Ошибка при unban_chat_member: %s", exc)


def finalize_unban(event: InboxEvent) -> None:
    """payload.is_unbanned=True, status=PROCESSED, handled=True."""
    new_payload = dict(event.payload or {})
    new_payload["is_unbanned"] = True
    event.payload = new_payload
    event.status = EventStatus.PROCESSED
    mark_payload_handled(event)
