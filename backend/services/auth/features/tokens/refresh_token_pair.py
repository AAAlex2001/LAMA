from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.auth import User, UserSession
from backend.services.auth.features.tokens.create_access_token import CreateAccessToken
from backend.services.auth.features.tokens.create_refresh_token import CreateRefreshToken
from backend.services.auth.settings import AuthSettings
from backend.services.auth.types import AuthResult


class RefreshTokenPair:
    def __init__(self, db: AsyncSession, settings: AuthSettings):
        self.db = db
        self.settings = settings

    async def execute(self, refresh_token: str) -> AuthResult:
        user_id = self._decode_user_id(refresh_token)

        session_query = select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.refresh_token == refresh_token,
            UserSession.is_active.is_(True),
        )
        session_result = await self.db.execute(session_query)
        session = session_result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

        user_query = (
            select(User)
            .options(selectinload(User.telegram_account))
            .where(User.id == user_id)
        )
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

        access_token = CreateAccessToken(self.settings).execute(user.id)
        next_refresh_token = CreateRefreshToken(self.settings).execute(user.id)
        now = datetime.now(timezone.utc)

        session.access_token = access_token
        session.refresh_token = next_refresh_token
        session.expires_at = now + timedelta(minutes=self.settings.access_token_expire_minutes)
        session.last_used_at = now
        await self.db.flush()

        return AuthResult(
            user=user,
            access_token=access_token,
            refresh_token=next_refresh_token,
        )

    def _decode_user_id(self, refresh_token: str) -> int:
        try:
            payload = jwt.decode(
                refresh_token,
                self.settings.jwt_secret,
                algorithms=[self.settings.jwt_algorithm],
            )
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=401, detail="Invalid token type")
            return int(payload.get("sub"))
        except (JWTError, TypeError, ValueError):
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
