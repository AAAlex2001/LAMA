from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import UserSession


class ListUserSessions:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, user_id: int) -> tuple[list[UserSession], int]:
        base_query = select(UserSession).where(UserSession.user_id == user_id)
        count_result = await self.db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total = count_result.scalar() or 0

        sessions_result = await self.db.execute(
            base_query.order_by(desc(UserSession.created_at))
        )
        return list(sessions_result.scalars().all()), total
