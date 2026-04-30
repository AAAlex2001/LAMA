from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from backend.models.bots import Bot as BotModel
from backend.models.channels import ChannelGroup


class GetBotByChat:
    async def execute(self, db: AsyncSession, chat_id: int) -> BotModel | None:
        channel = await self.get_channel(db, chat_id)
        return channel.bot if channel and channel.bot else None

    async def get_channel(self, db: AsyncSession, chat_id: int) -> ChannelGroup | None:
        result = await db.execute(
            select(ChannelGroup)
            .where(
                or_(
                    ChannelGroup.telegram_id == chat_id,
                    ChannelGroup.linked_chat_id == chat_id,
                )
            )
            .options(joinedload(ChannelGroup.bot))
        )
        return result.unique().scalars().first()
