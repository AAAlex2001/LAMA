from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.channel.features.permissions import ApplyChannelPermissions
from backend.services.channel.utils.query_utils import get_channel


class UpdateNightModeSettings:
    """Сохраняет настройки ночного режима канала и применяет permissions."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        enabled: bool,
        start: Optional[str],
        end: Optional[str],
        block_media: bool,
        block_text: bool,
    ) -> ChannelGroup:
        """Возвращает обновлённый канал. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id, load_bot=True)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        channel.night_mode_enabled = enabled
        channel.night_mode_start = start
        channel.night_mode_end = end
        channel.night_mode_block_media = block_media
        channel.night_mode_block_text = block_text

        await ApplyChannelPermissions(self.db).execute(channel)
        return channel
