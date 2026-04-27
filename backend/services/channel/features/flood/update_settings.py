from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ActionType, ChannelGroup
from backend.services.channel.utils.query_utils import get_channel


class UpdateFloodSettings:
    """Сохраняет настройки антифлуда канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        message_limit: Optional[int] = None,
        interval_seconds: Optional[int] = None,
        action: Optional[ActionType] = None,
        mute_duration_minutes: Optional[int] = None,
    ) -> ChannelGroup:
        """Возвращает обновлённый канал. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        channel.flood_message_limit = message_limit
        channel.flood_interval_seconds = interval_seconds
        channel.flood_mute_duration_minutes = mute_duration_minutes
        if action is not None:
            channel.flood_action = action

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
