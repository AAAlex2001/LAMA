from datetime import datetime, timezone
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import (
    ChannelGroup,
    ChannelFloodState,
    ActionType,
)


class FloodService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_flood_by_telegram_id(
        self,
        telegram_id: int,
        user_id: Optional[int],
    ) -> Tuple[bool, Optional[ActionType], Optional[int]]:
        """
        Проверить, не превысил ли пользователь порог флуда в канале.

        Возвращает:
        (is_flood, action, mute_duration_minutes)
        """
        if user_id is None:
            return False, None, None

        # Получаем канал по telegram_id
        query = select(ChannelGroup).where(ChannelGroup.telegram_id == telegram_id)
        result = await self.db.execute(query)
        channel: Optional[ChannelGroup] = result.scalar_one_or_none()

        if not channel:
            return False, None, None

        # Если настройки антифлуда не заданы — ничего не делаем
        if not channel.flood_message_limit or not channel.flood_interval_seconds:
            return False, None, None

        now = datetime.now(timezone.utc)

        # Ищем состояние для (channel_id, user_id)
        state_query = select(ChannelFloodState).where(
            ChannelFloodState.channel_id == channel.id,
            ChannelFloodState.user_id == user_id,
        )
        state_result = await self.db.execute(state_query)
        state: Optional[ChannelFloodState] = state_result.scalar_one_or_none()

        if not state:
            # Создаём новое состояние
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

        # Проверяем окно
        window_delta = (now - state.window_start).total_seconds()
        if window_delta > channel.flood_interval_seconds:
            # Сбрасываем окно
            state.message_count = 1
            state.window_start = now
            state.last_message_at = now
            await self.db.commit()
            await self.db.refresh(state)
            return False, None, None

        # Увеличиваем счётчик
        state.message_count += 1
        state.last_message_at = now
        await self.db.commit()
        await self.db.refresh(state)

        if state.message_count > channel.flood_message_limit:
            # Флуд зафиксирован
            return True, channel.flood_action, channel.flood_mute_duration_minutes

        return False, None, None

    async def update_channel_flood(
        self,
        channel_id: int,
        owner_id: int,
        flood_message_limit: Optional[int] = None,
        flood_interval_seconds: Optional[int] = None,
        flood_action: Optional[ActionType] = None,
        flood_mute_duration_minutes: Optional[int] = None,
    ) -> Optional[ChannelGroup]:
        """Обновить настройки антифлуда для канала."""
        query = select(ChannelGroup).where(
            ChannelGroup.id == channel_id,
            ChannelGroup.owner_id == owner_id,
        )
        result = await self.db.execute(query)
        channel: Optional[ChannelGroup] = result.scalar_one_or_none()

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


