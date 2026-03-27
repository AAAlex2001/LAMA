import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import case, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ActionType, ChannelFloodState, ChannelGroup
from backend.services.channel.utils.query_utils import get_channel, get_channel_by_telegram_id

logger = logging.getLogger(__name__)


class FloodService:
    """Проверка и настройка антифлуда."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_flood(
        self,
        channel: ChannelGroup,
        user_id: int,
    ) -> tuple[bool, Optional[ActionType], Optional[int]]:
        """Проверить флуд для уже загруженного канала."""
        if not channel.flood_message_limit or not channel.flood_interval_seconds:
            return False, None, None

        count = await self.increment_counter(
            channel.id, user_id, channel.flood_interval_seconds,
        )

        if count > channel.flood_message_limit:
            await self.reset_counter(channel.id, user_id)
            return True, channel.flood_action, channel.flood_mute_duration_minutes

        return False, None, None

    async def check_by_telegram_id(
        self,
        telegram_id: int,
        user_id: Optional[int],
    ) -> tuple[bool, Optional[ActionType], Optional[int]]:
        """Проверить, не флудит ли пользователь."""
        if user_id is None:
            return False, None, None

        channel = await get_channel_by_telegram_id(self.db, telegram_id)
        if not channel:
            return False, None, None

        return await self.check_flood(channel, user_id)

    async def increment_counter(
        self, channel_id: int, user_id: int, interval_seconds: int,
    ) -> int:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=interval_seconds)
        window_expired = ChannelFloodState.window_start <= cutoff

        insert_stmt = pg_insert(ChannelFloodState).values(
            channel_id=channel_id,
            user_id=user_id,
            message_count=1,
            window_start=now,
            last_message_at=now,
        )

        stmt = insert_stmt.on_conflict_do_update(
            index_elements=["channel_id", "user_id"],
            set_={
                "message_count": case(
                    (window_expired, 1),
                    else_=ChannelFloodState.message_count + 1,
                ),
                "window_start": case(
                    (window_expired, now),
                    else_=ChannelFloodState.window_start,
                ),
                "last_message_at": now,
            },
        ).returning(ChannelFloodState.message_count)

        result = await self.db.execute(stmt)
        count = result.scalar_one()

        logger.info(
            "Flood check: channel=%s user=%s count=%s",
            channel_id, user_id, count,
        )

        return count

    async def reset_counter(self, channel_id: int, user_id: int) -> None:
        now = datetime.now(timezone.utc)
        stmt = (
            update(ChannelFloodState)
            .where(
                ChannelFloodState.channel_id == channel_id,
                ChannelFloodState.user_id == user_id,
            )
            .values(message_count=0, window_start=now)
        )
        await self.db.execute(stmt)

    async def update_settings(
        self,
        channel_id: int,
        owner_id: int,
        flood_message_limit: Optional[int] = None,
        flood_interval_seconds: Optional[int] = None,
        flood_action: Optional[ActionType] = None,
        flood_mute_duration_minutes: Optional[int] = None,
    ) -> ChannelGroup:
        """Обновить настройки антифлуда."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail='Channel not found')

        channel.flood_message_limit = flood_message_limit
        channel.flood_interval_seconds = flood_interval_seconds
        if flood_action is not None:
            channel.flood_action = flood_action
        channel.flood_mute_duration_minutes = flood_mute_duration_minutes

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
