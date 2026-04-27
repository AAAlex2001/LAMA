from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.schemas.channels import ChannelGroupCreate


class CreateChannel:
    """Создаёт канал; возвращает существующий, если уже есть с таким telegram_id."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, data: ChannelGroupCreate, owner_id: int) -> ChannelGroup:
        existing = (await self.db.execute(
            select(ChannelGroup).where(
                ChannelGroup.telegram_id == data.telegram_id,
                ChannelGroup.owner_id == owner_id,
            )
        )).scalar_one_or_none()
        if existing:
            return existing

        channel = ChannelGroup(
            owner_id=owner_id,
            telegram_id=data.telegram_id,
            channel_type=data.channel_type,
            title=data.title,
            username=data.username,
            description=data.description,
            is_active=True,
        )
        self.db.add(channel)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
