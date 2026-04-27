from typing import List

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelModerationRule
from backend.services.channel.utils.query_utils import get_channel


class ListModerationRules:
    """Возвращает все правила модерации канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, owner_id: int) -> List[ChannelModerationRule]:
        """Возвращает список правил. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        rows = (await self.db.execute(
            select(ChannelModerationRule).where(ChannelModerationRule.channel_id == channel_id)
        )).scalars().all()
        return list(rows)
