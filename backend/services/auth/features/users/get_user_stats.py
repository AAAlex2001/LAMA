from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import UserSession
from backend.models.bots import Bot as BotModel
from backend.models.bots import BotStatus
from backend.models.channels import ChannelGroup
from backend.models.publications import Publication, PublicationStatus
from backend.schemas.auth import UserStatsResponse


async def count_where(db: AsyncSession, *conditions) -> int:
    query = select(func.count())
    for condition in conditions:
        query = query.where(condition)
    result = await db.execute(query)
    return result.scalar() or 0


class GetUserStats:
    """Счётчики юзера: ботов/каналов/публикаций/сессий — всего и активных."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, user_id: int) -> UserStatsResponse:
        return UserStatsResponse(
            user_id=user_id,
            total_bots=await count_where(self.db, BotModel.owner_id == user_id),
            active_bots=await count_where(
                self.db, BotModel.owner_id == user_id, BotModel.status == BotStatus.ACTIVE,
            ),
            total_channels=await count_where(self.db, ChannelGroup.owner_id == user_id),
            active_channels=await count_where(
                self.db, ChannelGroup.owner_id == user_id, ChannelGroup.is_active.is_(True),
            ),
            total_publications=await count_where(self.db, Publication.owner_id == user_id),
            published_publications=await count_where(
                self.db,
                Publication.owner_id == user_id,
                Publication.status == PublicationStatus.PUBLISHED,
            ),
            total_sessions=await count_where(self.db, UserSession.user_id == user_id),
            active_sessions=await count_where(
                self.db, UserSession.user_id == user_id, UserSession.is_active.is_(True),
            ),
        )
