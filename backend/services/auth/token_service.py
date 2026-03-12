"""
JWT токены
"""
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import User, UserSession


class TokenService:
    """Сервис для работы с JWT токенами"""

    def __init__(
        self,
        db: AsyncSession,
        jwt_secret: str,
        jwt_algorithm: str = "HS256",
        access_token_expire_minutes: int = 60 * 24,
        refresh_token_expire_days: int = 30
    ):
        self.db = db
        self.jwt_secret = jwt_secret
        self.jwt_algorithm = jwt_algorithm
        self.access_token_expire_minutes = access_token_expire_minutes
        self.refresh_token_expire_days = refresh_token_expire_days

    def create_access_token(self, user_id: int) -> str:
        """Создать access token"""
        expires = datetime.now(timezone.utc) + \
                               timedelta(
                                   minutes=self.access_token_expire_minutes)
        payload = {
            "sub": str(user_id),
            "type": "access",
            "exp": expires,
            "iat": datetime.now(timezone.utc),
            "jti": secrets.token_urlsafe(16)
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    def create_refresh_token(self, user_id: int) -> str:
        """Создать refresh token"""
        expires = datetime.now(timezone.utc) + \
                               timedelta(days=self.refresh_token_expire_days)
        payload = {
            "sub": str(user_id),
            "type": "refresh",
            "exp": expires,
            "iat": datetime.now(timezone.utc),
            "jti": secrets.token_urlsafe(16)
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    async def verify_access_token(self, token: str) -> Optional[User]:
        """Проверить access token и вернуть пользователя"""
        try:
            payload = jwt.decode(token, self.jwt_secret,
                                 algorithms=[self.jwt_algorithm])
            user_id = int(payload.get("sub"))
            token_type = payload.get("type")

            if token_type != "access":
                return None

            query = select(UserSession).where(
                UserSession.access_token == token,
                UserSession.is_active == True
            )
            result = await self.db.execute(query)
            session = result.scalar_one_or_none()

            if not session:
                return None

            session.last_used_at = datetime.now(timezone.utc)
            await self.db.flush()

            user_query = select(User).where(User.id == user_id)
            user_result = await self.db.execute(user_query)
            user = user_result.scalar_one_or_none()

            return user if user and user.is_active else None

        except JWTError:
            return None

    async def refresh_access_token(self, refresh_token: str) -> tuple[str, str]:
        """
        Обновить access token по refresh token
        Возвращает: (new_access_token, new_refresh_token)
        """
        try:
            payload = jwt.decode(refresh_token, self.jwt_secret, algorithms=[
                                 self.jwt_algorithm])
            user_id = int(payload.get("sub"))
            token_type = payload.get("type")

            if token_type != "refresh":
                raise ValueError("Invalid token type")

            query = select(UserSession).where(
                UserSession.refresh_token == refresh_token,
                UserSession.is_active == True
            )
            result = await self.db.execute(query)
            session = result.scalar_one_or_none()

            if not session:
                raise ValueError("Invalid or expired refresh token")

            new_access_token = self.create_access_token(user_id)
            new_refresh_token = self.create_refresh_token(user_id)

            session.access_token = new_access_token
            session.refresh_token = new_refresh_token
            session.expires_at = datetime.now(
                timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
            session.last_used_at = datetime.now(timezone.utc)

            await self.db.flush()

            return new_access_token, new_refresh_token

        except JWTError:
            raise ValueError("Invalid or expired refresh token")

    async def logout(self, token: str) -> bool:
        """Завершить сессию (logout)"""
        query = select(UserSession).where(UserSession.access_token == token)
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()

        if not session:
            return False

        session.is_active = False
        await self.db.flush()
        return True
