import logging
from datetime import datetime, timezone
from typing import Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ActionType, ChannelFloodState, ChannelGroup
from backend.services.channel.utils.query_utils import get_channel, get_channel_by_telegram_id

logger = logging.getLogger(__name__)


class FloodService:
    """Проверка и настройка антифлуда."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_by_telegram_id(
        self,
        telegram_id: int,
        user_id: Optional[int],
    ) -> Tuple[bool, Optional[ActionType], Optional[int]]:
        """Проверить, не флудит ли пользователь."""
        if user_id is None:
            return False, None, None

        channel = await get_channel_by_telegram_id(self.db, telegram_id)
        if not channel:
            logger.info("Flood check: no channel found for telegram_id=%s", telegram_id)
            return False, None, None

        if not channel.flood_message_limit or not channel.flood_interval_seconds:
            logger.info(
                "Flood check: channel %s has no flood settings (limit=%s, interval=%s)",
                channel.id, channel.flood_message_limit, channel.flood_interval_seconds,
            )
            return False, None, None

        now = datetime.now(timezone.utc)
        state = await self.get_flood_state(channel.id, user_id)

        if not state:
            state = ChannelFloodState(
                channel_id=channel.id,
                user_id=user_id,
                message_count=1,
                window_start=now,
                last_message_at=now,
            )
            self.db.add(state)
            await self.db.flush()
            return False, None, None

        window_delta = (now - state.window_start).total_seconds()
        if window_delta > channel.flood_interval_seconds:
            state.message_count = 1
            state.window_start = now
            state.last_message_at = now
            await self.db.flush()
            return False, None, None

        state.message_count += 1
        state.last_message_at = now
        await self.db.flush()

        logger.info(
            "Flood check: channel=%s user=%s count=%s/%s window=%.1fs/%ss",
            channel.id, user_id, state.message_count,
            channel.flood_message_limit, window_delta, channel.flood_interval_seconds,
        )

        if state.message_count > channel.flood_message_limit:
            state.message_count = 0
            state.window_start = now
            await self.db.flush()
            return True, channel.flood_action, channel.flood_mute_duration_minutes

        return False, None, None

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

    async def get_flood_state(self, channel_id: int, user_id: int) -> Optional[ChannelFloodState]:
        """Получить состояние флуда пользователя."""
        query = (
            select(ChannelFloodState)
            .where(
                ChannelFloodState.channel_id == channel_id,
                ChannelFloodState.user_id == user_id,
            )
            .with_for_update()
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
