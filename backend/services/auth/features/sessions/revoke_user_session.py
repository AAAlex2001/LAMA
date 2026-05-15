from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import UserSession


class RevokeUserSession:
    """Помечает чужую сессию `is_active=False`. 404 если она не принадлежит юзеру."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, session_id: int, user_id: int) -> None:
        query = select(UserSession).where(
            UserSession.id == session_id,
            UserSession.user_id == user_id,
        )
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        session.is_active = False
        await self.db.flush()
