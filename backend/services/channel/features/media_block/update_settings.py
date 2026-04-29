from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.channel.features.permissions import ApplyChannelPermissions
from backend.services.channel.utils.query_utils import get_channel


class UpdateMediaBlock:
    """Сохраняет список заблокированных типов медиа канала и применяет permissions."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        block_media_types: Optional[List[str]],
    ) -> ChannelGroup:
        """Возвращает обновлённый канал. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id, load_bot=True)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        channel.block_media_types = block_media_types
        await ApplyChannelPermissions(self.db).execute(channel)
        return channel
