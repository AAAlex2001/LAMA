from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import UserSession


class LogoutSession:
    """Помечает `UserSession.is_active=False` по access-токену."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, access_token: str) -> None:
        query = select(UserSession).where(
            UserSession.access_token == access_token,
            UserSession.is_active.is_(True),
        )
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=401, detail="Invalid token")

        session.is_active = False
        await self.db.flush()
