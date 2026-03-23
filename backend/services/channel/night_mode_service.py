import os
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.channel.chat_permissions_service import ChatPermissionsService
from backend.services.channel.utils.query_utils import get_channel


class NightModeService:
    """Управление ночным режимом."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_settings(
        self,
        channel_id: int,
        owner_id: int,
        night_mode_enabled: bool,
        night_mode_start: Optional[str],
        night_mode_end: Optional[str],
        night_mode_block_media: bool,
        night_mode_block_text: bool,
    ) -> ChannelGroup:
        """Обновить настройки ночного режима и применить permissions."""
        channel = await get_channel(self.db, channel_id, owner_id, load_bot=True)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        channel.night_mode_enabled = night_mode_enabled
        channel.night_mode_start = night_mode_start
        channel.night_mode_end = night_mode_end
        channel.night_mode_block_media = night_mode_block_media
        channel.night_mode_block_text = night_mode_block_text

        perms_service = ChatPermissionsService(self.db)
        await perms_service.apply_permissions(channel)

        return channel
