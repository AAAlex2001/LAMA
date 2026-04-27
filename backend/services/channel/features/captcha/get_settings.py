from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.channel.utils.query_utils import get_channel


class GetCaptchaSettings:
    """Возвращает канал с настройками капчи."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, owner_id: int) -> ChannelGroup:
        """Возвращает канал. 404 если не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")
        return channel
