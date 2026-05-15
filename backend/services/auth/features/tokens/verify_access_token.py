from datetime import datetime, timezone

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.auth import User, UserSession
from backend.services.auth.settings import AuthSettings


class VerifyAccessToken:
    """Декодирует access JWT и проверяет что сессия в БД ещё активна + юзер активен."""

    def __init__(self, db: AsyncSession, settings: AuthSettings):
        self.db = db
        self.settings = settings

    async def execute(self, token: str) -> User | None:
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret,
                algorithms=[self.settings.jwt_algorithm],
            )
            user_id = int(payload.get("sub"))
        except (JWTError, TypeError, ValueError):
            return None

        if payload.get("type") != "access":
            return None

        session_query = select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.access_token == token,
            UserSession.is_active.is_(True),
        )
        session_result = await self.db.execute(session_query)
        session = session_result.scalar_one_or_none()
        if not session:
            return None

        now = datetime.now(timezone.utc)
        if session.expires_at <= now:
            session.is_active = False
            await self.db.flush()
            return None

        user_query = (
            select(User)
            .options(selectinload(User.telegram_account))
            .where(User.id == user_id)
        )
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one_or_none()
        if not user or not user.is_active:
            return None

        session.last_used_at = now
        await self.db.flush()
        return user
