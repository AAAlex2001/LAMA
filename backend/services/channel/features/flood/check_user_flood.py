import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy import case, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ActionType, ChannelFloodState, ChannelGroup

logger = logging.getLogger(__name__)


class CheckUserFlood:
    """Проверяет превышение лимита сообщений пользователем за окно времени."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel: ChannelGroup,
        user_id: int,
    ) -> Tuple[bool, Optional[ActionType], Optional[int]]:
        """Возвращает (is_flood, action, mute_duration_minutes)."""
        if not channel.flood_message_limit or not channel.flood_interval_seconds:
            return False, None, None

        count = await self.increment_counter(channel.id, user_id, channel.flood_interval_seconds)
        logger.info("Flood check: channel=%s user=%s count=%s", channel.id, user_id, count)

        if count <= channel.flood_message_limit:
            return False, None, None

        await self.reset_counter(channel.id, user_id)
        return True, channel.flood_action, channel.flood_mute_duration_minutes

    async def increment_counter(self, channel_id: int, user_id: int, interval_seconds: int) -> int:
        """Атомарно инкрементирует счётчик; обнуляет при истёкшем окне. Возвращает новое значение."""
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=interval_seconds)
        window_expired = ChannelFloodState.window_start <= cutoff

        upsert = pg_insert(ChannelFloodState).values(
            channel_id=channel_id,
            user_id=user_id,
            message_count=1,
            window_start=now,
            last_message_at=now,
        ).on_conflict_do_update(
            index_elements=["channel_id", "user_id"],
            set_={
                "message_count": case((window_expired, 1), else_=ChannelFloodState.message_count + 1),
                "window_start": case((window_expired, now), else_=ChannelFloodState.window_start),
                "last_message_at": now,
            },
        ).returning(ChannelFloodState.message_count)

        return (await self.db.execute(upsert)).scalar_one()

    async def reset_counter(self, channel_id: int, user_id: int) -> None:
        """Сбрасывает счётчик на 0 и стартует новое окно."""
        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(ChannelFloodState)
            .where(
                ChannelFloodState.channel_id == channel_id,
                ChannelFloodState.user_id == user_id,
            )
            .values(message_count=0, window_start=now)
        )
