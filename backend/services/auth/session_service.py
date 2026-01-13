"""
Управление сессиями пользователей
"""
from typing import List, Tuple

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import UserSession


class SessionService:
    """Сервис для управления сессиями"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_sessions(self, user_id: int) -> Tuple[List[UserSession], int]:
        """Получить список сессий пользователя"""
        query = select(UserSession).where(UserSession.user_id == user_id)

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(desc(UserSession.created_at))
        result = await self.db.execute(query)
        sessions = list(result.scalars().all())

        return sessions, total or 0

    async def revoke_session(self, session_id: int, user_id: int) -> bool:
        """Отозвать сессию"""
        query = select(UserSession).where(
            UserSession.id == session_id,
            UserSession.user_id == user_id
        )
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()

        if not session:
            return False

        session.is_active = False
        await self.db.commit()
        return True
