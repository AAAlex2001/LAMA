from datetime import datetime, timezone
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ActionType, ChannelFloodState, ChannelGroup
from backend.services.channel.utils.query_utils import get_channel, get_channel_by_telegram_id


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
            return False, None, None

        if not channel.flood_message_limit or not channel.flood_interval_seconds:
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
            await self.db.commit()
            await self.db.refresh(state)
            return False, None, None

        window_delta = (now - state.window_start).total_seconds()
        if window_delta > channel.flood_interval_seconds:
            state.message_count = 1
            state.window_start = now
            state.last_message_at = now
            await self.db.commit()
            await self.db.refresh(state)
            return False, None, None

        state.message_count += 1
        state.last_message_at = now
        await self.db.commit()
        await self.db.refresh(state)

        if state.message_count > channel.flood_message_limit:
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
    ) -> Optional[ChannelGroup]:
        """Обновить настройки антифлуда."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            return None

        if flood_message_limit is not None:
            channel.flood_message_limit = flood_message_limit
        if flood_interval_seconds is not None:
            channel.flood_interval_seconds = flood_interval_seconds
        if flood_action is not None:
            channel.flood_action = flood_action
        if flood_mute_duration_minutes is not None:
            channel.flood_mute_duration_minutes = flood_mute_duration_minutes

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(channel)
        return channel

    async def get_flood_state(self, channel_id: int, user_id: int) -> Optional[ChannelFloodState]:
        """Получить состояние флуда пользователя."""
        query = select(ChannelFloodState).where(
            ChannelFloodState.channel_id == channel_id,
            ChannelFloodState.user_id == user_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
