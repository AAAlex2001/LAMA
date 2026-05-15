"""Один замер подписчиков канала: спрашиваем у бота сколько сейчас людей в канале
и сохраняем это число с текущей датой в таблицу замеров.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup, ChannelSubscribersSnapshot
from backend.services.bot_provider import resolve_for_channel

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SnapshotTaken:
    channel_id: int
    taken_at: datetime
    subscribers_count: int


class TakeChannelSnapshot:
    """Один замер подписчиков канала. Если бот не отвечает — вернёт None и ничего не запишет."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int) -> Optional[SnapshotTaken]:
        channel = await self.fetch_channel(channel_id)
        if channel is None:
            logger.info("snapshot_skip_no_channel: channel_id=%s", channel_id)
            return None
        count = await self.fetch_subscribers_count(channel)
        if count is None:
            return None
        now = datetime.now(timezone.utc)
        snapshot = ChannelSubscribersSnapshot(
            channel_id=channel.id,
            taken_at=now,
            subscribers_count=count,
        )
        self.db.add(snapshot)
        return SnapshotTaken(channel_id=channel.id, taken_at=now, subscribers_count=count)

    async def fetch_channel(self, channel_id: int) -> Optional[ChannelGroup]:
        stmt = select(ChannelGroup).where(ChannelGroup.id == channel_id)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def fetch_subscribers_count(self, channel: ChannelGroup) -> Optional[int]:
        bot = await self.try_resolve_bot(channel)
        if bot is None:
            return None
        try:
            return await bot.bot.get_chat_member_count(chat_id=channel.telegram_id)
        except TelegramAPIError as exc:
            logger.info("snapshot_api_failed: channel=%s err=%s", channel.id, exc)
            return None
        except Exception as exc:
            logger.warning("snapshot_unexpected: channel=%s err=%s", channel.id, exc)
            return None

    async def try_resolve_bot(self, channel: ChannelGroup):
        try:
            return await resolve_for_channel(self.db, channel)
        except Exception as exc:
            logger.warning("snapshot_resolve_failed: channel=%s err=%s", channel.id, exc)
            return None
