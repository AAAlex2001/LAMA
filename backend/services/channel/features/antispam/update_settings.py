from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ActionType, ChannelGroup, LinkFilterMode
from backend.services.channel.utils.query_utils import get_channel


class UpdateAntispamSettings:
    """Сохраняет настройки антиспам-фильтра ссылок канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        link_filter_mode: Optional[LinkFilterMode] = None,
        link_whitelist: Optional[List[str]] = None,
        link_blacklist: Optional[List[str]] = None,
        link_filter_action: Optional[ActionType] = None,
        link_filter_mute_duration: Optional[int] = None,
    ) -> ChannelGroup:
        """Возвращает обновлённый канал. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        if link_filter_mode is not None:
            channel.link_filter_mode = link_filter_mode
        if link_whitelist is not None:
            channel.link_whitelist = link_whitelist
        if link_blacklist is not None:
            channel.link_blacklist = link_blacklist
        if link_filter_action is not None:
            channel.link_filter_action = link_filter_action
        if link_filter_mute_duration is not None:
            channel.link_filter_mute_duration = link_filter_mute_duration

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
