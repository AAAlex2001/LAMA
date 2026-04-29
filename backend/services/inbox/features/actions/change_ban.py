"""Изменить тип/срок бана пользователя в одном или всех каналах."""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from aiogram.types import ChatPermissions
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventStatus
from backend.schemas.inbox.events import SpecificActionResult
from backend.services.inbox.features.lookup import mark_payload_handled

logger = logging.getLogger(__name__)


async def change_ban(
    db: AsyncSession, event: InboxEvent, client, payload: dict,
) -> SpecificActionResult:
    """payload: ban_type ('ban'|'mute'), duration_seconds (None=∞), everywhere (bool)."""
    if not event.tg_user_id:
        raise HTTPException(status_code=404, detail="Event not found")

    ban_type = payload.get("ban_type", "ban")
    duration_seconds = payload.get("duration_seconds")
    everywhere = payload.get("everywhere", False)

    until_date = compute_until_date(duration_seconds)
    target_channels = await load_target_channels(db, event, everywhere)

    affected = await apply_ban_to_channels(
        client, target_channels, event.tg_user_id, ban_type, until_date,
    )

    finalize_change_ban(event, ban_type, duration_seconds, everywhere)
    await db.flush()
    return SpecificActionResult(status="ban_updated", affected_channels=affected)


def compute_until_date(duration_seconds: Optional[int]) -> Optional[datetime]:
    """now + duration_seconds или None (бессрочно)."""
    if not duration_seconds:
        return None
    return datetime.now(timezone.utc) + timedelta(seconds=int(duration_seconds))


async def load_target_channels(
    db: AsyncSession, event: InboxEvent, everywhere: bool,
) -> List[ChannelGroup]:
    """everywhere=True — все каналы пользователя; иначе — один канал события."""
    if everywhere:
        rows = (await db.execute(
            select(ChannelGroup).where(ChannelGroup.owner_id == event.owner_id)
        )).scalars().all()
        return list(rows)

    channel = await db.get(ChannelGroup, event.channel_id) if event.channel_id else None
    return [channel] if (channel and channel.telegram_id) else []


async def apply_ban_to_channels(
    client,
    channels: List[ChannelGroup],
    user_id: int,
    ban_type: str,
    until_date: Optional[datetime],
) -> List[int]:
    """Применяет бан/мут ко всем каналам; возвращает id успешно затронутых."""
    affected: List[int] = []
    for channel in channels:
        if not (channel and channel.telegram_id):
            continue
        try:
            await ban_one_channel(client, channel, user_id, ban_type, until_date)
            affected.append(channel.id)
        except Exception as exc:
            logger.error("Не удалось изменить бан для канала %s: %s", channel.id, exc)
    return affected


async def ban_one_channel(
    client,
    channel: ChannelGroup,
    user_id: int,
    ban_type: str,
    until_date: Optional[datetime],
) -> None:
    """mute → restrict_chat_member; ban → ban_chat_member. with/without until_date."""
    if ban_type == "mute":
        permissions = ChatPermissions(can_send_messages=False)
        if until_date:
            await client.restrict_chat_member(
                chat_id=channel.telegram_id, user_id=user_id,
                permissions=permissions, until_date=until_date,
            )
        else:
            await client.restrict_chat_member(
                chat_id=channel.telegram_id, user_id=user_id, permissions=permissions,
            )
        return

    if until_date:
        await client.ban_chat_member(
            chat_id=channel.telegram_id, user_id=user_id, until_date=until_date,
        )
    else:
        await client.ban_chat_member(chat_id=channel.telegram_id, user_id=user_id)


def finalize_change_ban(
    event: InboxEvent, ban_type: str, duration_seconds: Optional[int], everywhere: bool,
) -> None:
    """Записать ban_type/duration/everywhere в payload + status=PROCESSED."""
    new_payload = dict(event.payload or {})
    new_payload["ban_type"] = ban_type
    new_payload["duration_seconds"] = duration_seconds
    new_payload["everywhere"] = everywhere
    new_payload["is_unbanned"] = False
    event.payload = new_payload
    event.status = EventStatus.PROCESSED
    mark_payload_handled(event)
