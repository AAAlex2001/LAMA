"""
Статистика пользователей
"""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import UserSession


class StatsService:
    """Сервис для получения статистики пользователей"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_stats(self, user_id: int) -> dict:
        """Получить статистику пользователя"""
        from backend.models.bots import Bot as BotModel, BotStatus
        from backend.models.channels import ChannelGroup
        from backend.models.publications import Publication, PublicationStatus

        total_bots_query = select(func.count()).where(
            BotModel.owner_id == user_id)
        total_bots_result = await self.db.execute(total_bots_query)
        total_bots = total_bots_result.scalar() or 0

        active_bots_query = select(func.count()).where(
            BotModel.owner_id == user_id,
            BotModel.status == BotStatus.ACTIVE
        )
        active_bots_result = await self.db.execute(active_bots_query)
        active_bots = active_bots_result.scalar() or 0

        total_channels_query = select(func.count()).where(
            ChannelGroup.owner_id == user_id)
        total_channels_result = await self.db.execute(total_channels_query)
        total_channels = total_channels_result.scalar() or 0

        active_channels_query = select(func.count()).where(
            ChannelGroup.owner_id == user_id,
            ChannelGroup.is_active == True
        )
        active_channels_result = await self.db.execute(active_channels_query)
        active_channels = active_channels_result.scalar() or 0

        total_publications_query = select(func.count()).where(
            Publication.owner_id == user_id)
        total_publications_result = await self.db.execute(total_publications_query)
        total_publications = total_publications_result.scalar() or 0

        published_publications_query = select(func.count()).where(
            Publication.owner_id == user_id,
            Publication.status == PublicationStatus.PUBLISHED
        )
        published_publications_result = await self.db.execute(published_publications_query)
        published_publications = published_publications_result.scalar() or 0

        total_sessions_query = select(func.count()).where(
            UserSession.user_id == user_id)
        total_sessions_result = await self.db.execute(total_sessions_query)
        total_sessions = total_sessions_result.scalar() or 0

        active_sessions_query = select(func.count()).where(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        )
        active_sessions_result = await self.db.execute(active_sessions_query)
        active_sessions = active_sessions_result.scalar() or 0

        return {
            "user_id": user_id,
            "total_bots": total_bots,
            "active_bots": active_bots,
            "total_channels": total_channels,
            "active_channels": active_channels,
            "total_publications": total_publications,
            "published_publications": published_publications,
            "total_sessions": total_sessions,
            "active_sessions": active_sessions
        }
