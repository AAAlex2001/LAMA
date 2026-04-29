"""Массовые действия над событиями инбокса: read / ignore / delete / block / unblock."""

import logging
from typing import List

from aiogram.exceptions import TelegramAPIError
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot
from backend.models.channels import ChannelGroup
from backend.models.direct import DirectChat
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import BulkActionType, EventStatus
from backend.services.bot_provider import resolve_by_token
from backend.services.inbox.features.create_block_notification import create_block_notification

logger = logging.getLogger(__name__)


class ExecuteBulkAction:
    """Выполняет массовое действие над выбранными или всеми событиями пользователя."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        event_ids: List[int],
        action: BulkActionType,
        apply_to_all: bool = False,
    ) -> int:
        """Возвращает количество затронутых событий."""
        base_where = build_base_where(owner_id, event_ids, apply_to_all)
        if base_where is None:
            return 0

        if action == BulkActionType.READ:
            modified = await update_status(self.db, base_where, EventStatus.PROCESSED)
        elif action == BulkActionType.IGNORE:
            modified = await update_status(self.db, base_where, EventStatus.IGNORED)
        elif action == BulkActionType.DELETE:
            modified = await delete_events(self.db, base_where)
        elif action == BulkActionType.BLOCK:
            modified = await bulk_block(self.db, base_where)
        elif action == BulkActionType.UNBLOCK:
            modified = await bulk_unblock(self.db, base_where)
        else:
            return 0

        await self.db.flush()
        return modified


# ──────────────────────────────────────────────────────────────────────
# Простые действия — UPDATE статуса / DELETE
# ──────────────────────────────────────────────────────────────────────


def build_base_where(owner_id: int, event_ids: List[int], apply_to_all: bool):
    """SQL-условие выбора событий; None если нечего обрабатывать."""
    if apply_to_all:
        return InboxEvent.owner_id == owner_id
    if not event_ids:
        return None
    return (InboxEvent.owner_id == owner_id) & InboxEvent.id.in_(event_ids)


async def update_status(db: AsyncSession, base_where, status: EventStatus) -> int:
    """UPDATE inbox_events SET status=… WHERE …; возвращает rowcount."""
    stmt = update(InboxEvent).where(base_where).values(status=status)
    return (await db.execute(stmt)).rowcount


async def delete_events(db: AsyncSession, base_where) -> int:
    """DELETE FROM inbox_events WHERE …; возвращает rowcount."""
    stmt = delete(InboxEvent).where(base_where)
    return (await db.execute(stmt)).rowcount


# ──────────────────────────────────────────────────────────────────────
# BLOCK — DM или канал
# ──────────────────────────────────────────────────────────────────────


async def bulk_block(db: AsyncSession, base_where) -> int:
    """Блокирует пользователей по событиям: DM-чаты и/или каналы. Возвращает успешные."""
    events = await fetch_events(db, base_where)
    bots_map, channels_map = await preload_bots_and_channels(db, events)

    modified = 0
    for event in events:
        if not event.channel_id:
            await block_dm(db, event)
            modified += 1
            continue

        bot = bots_map.get(event.bot_id) if event.bot_id else None
        channel = channels_map.get(event.channel_id)
        if not (event.tg_user_id and bot and channel and channel.telegram_id):
            continue

        if await ban_in_channel(db, event, bot, channel):
            modified += 1
    return modified


async def block_dm(db: AsyncSession, event: InboxEvent) -> None:
    """Блокирует DM-чат пользователя; помечает событие BANNED + создаёт notification."""
    dm_chat_id = (event.payload or {}).get("chat_id")
    if dm_chat_id and event.bot_id:
        await db.execute(
            update(DirectChat)
            .where(DirectChat.bot_id == event.bot_id, DirectChat.tg_chat_id == dm_chat_id)
            .values(is_blocked=True)
        )
    event.status = EventStatus.BANNED
    await create_block_notification(db, event)


async def ban_in_channel(
    db: AsyncSession, event: InboxEvent, bot: Bot, channel: ChannelGroup,
) -> bool:
    """ban_chat_member в TG; True если получилось."""
    try:
        client = resolve_by_token(bot.token)
        await client.ban_chat_member(channel.telegram_id, event.tg_user_id)
    except TelegramAPIError as exc:
        logger.error(
            "Не удалось выполнить block для пользователя %s в канале %s: %s",
            event.tg_user_id, channel.telegram_id, exc, exc_info=True,
        )
        return False

    event.status = EventStatus.BANNED
    await create_block_notification(db, event)
    return True


# ──────────────────────────────────────────────────────────────────────
# UNBLOCK — только канал (DM unblock делается через specific actions)
# ──────────────────────────────────────────────────────────────────────


async def bulk_unblock(db: AsyncSession, base_where) -> int:
    """Снимает бан у пользователей в каналах; возвращает успешные."""
    events = await fetch_events(db, base_where)
    bots_map, channels_map = await preload_bots_and_channels(db, events)

    modified = 0
    for event in events:
        if not (event.tg_user_id and event.bot_id and event.channel_id):
            continue
        bot = bots_map.get(event.bot_id)
        channel = channels_map.get(event.channel_id)
        if not (bot and channel and channel.telegram_id):
            continue
        if await unban_in_channel(event, bot, channel):
            modified += 1
    return modified


async def unban_in_channel(event: InboxEvent, bot: Bot, channel: ChannelGroup) -> bool:
    """unban_chat_member в TG; True если получилось."""
    try:
        client = resolve_by_token(bot.token)
        await client.unban_chat_member(channel.telegram_id, event.tg_user_id)
    except Exception as exc:
        logger.error(
            "Не удалось выполнить unblock для пользователя %s в канале %s: %s",
            event.tg_user_id, channel.telegram_id, exc, exc_info=True,
        )
        return False
    event.status = EventStatus.PROCESSED
    return True


# ──────────────────────────────────────────────────────────────────────
# Запросы
# ──────────────────────────────────────────────────────────────────────


async def fetch_events(db: AsyncSession, base_where) -> List[InboxEvent]:
    """Достаёт все события под условием WHERE."""
    return list((await db.execute(select(InboxEvent).where(base_where))).scalars().all())


async def preload_bots_and_channels(
    db: AsyncSession, events: List[InboxEvent],
) -> tuple[dict[int, Bot], dict[int, ChannelGroup]]:
    """Один запрос на ботов + один на каналы — чтобы не делать N+1 в цикле."""
    bot_ids = {e.bot_id for e in events if e.bot_id}
    channel_ids = {e.channel_id for e in events if e.channel_id}

    bots_map: dict[int, Bot] = {}
    channels_map: dict[int, ChannelGroup] = {}

    if bot_ids:
        rows = (await db.execute(select(Bot).where(Bot.id.in_(bot_ids)))).scalars().all()
        bots_map = {b.id: b for b in rows}
    if channel_ids:
        rows = (await db.execute(select(ChannelGroup).where(ChannelGroup.id.in_(channel_ids)))).scalars().all()
        channels_map = {c.id: c for c in rows}

    return bots_map, channels_map
