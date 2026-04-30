from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import UserSession
from backend.models.bots import Bot as BotModel
from backend.models.bots import BotStatus
from backend.models.channels import ChannelGroup
from backend.models.publications import Publication, PublicationStatus


class GetUserStats:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, user_id: int) -> dict:
        return {
            "user_id": user_id,
            "total_bots": await self._count(BotModel.owner_id == user_id),
            "active_bots": await self._count(
                BotModel.owner_id == user_id,
                BotModel.status == BotStatus.ACTIVE,
            ),
            "total_channels": await self._count(ChannelGroup.owner_id == user_id),
            "active_channels": await self._count(
                ChannelGroup.owner_id == user_id,
                ChannelGroup.is_active.is_(True),
            ),
            "total_publications": await self._count(Publication.owner_id == user_id),
            "published_publications": await self._count(
                Publication.owner_id == user_id,
                Publication.status == PublicationStatus.PUBLISHED,
            ),
            "total_sessions": await self._count(UserSession.user_id == user_id),
            "active_sessions": await self._count(
                UserSession.user_id == user_id,
                UserSession.is_active.is_(True),
            ),
        }

    async def _count(self, *conditions) -> int:
        query = select(func.count())
        for condition in conditions:
            query = query.where(condition)
        result = await self.db.execute(query)
        return result.scalar() or 0
