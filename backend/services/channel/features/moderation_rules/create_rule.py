from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelModerationRule
from backend.schemas.channels import ChannelModerationRuleCreate
from backend.services.channel.utils.query_utils import get_channel


class CreateModerationRule:
    """Создаёт правило модерации (запрещённую фразу) для канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        data: ChannelModerationRuleCreate,
    ) -> ChannelModerationRule:
        """Возвращает созданное правило. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        rule = ChannelModerationRule(
            channel_id=channel_id,
            phrase=data.phrase,
            action=data.action,
            mute_duration_minutes=data.mute_duration_minutes,
        )
        self.db.add(rule)
        await self.db.flush()
        await self.db.refresh(rule)
        return rule
