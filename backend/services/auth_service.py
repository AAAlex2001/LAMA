from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import jwt
from passlib.context import CryptContext
from sqlalchemy import select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.models.db_models import User, RefreshToken


class AuthConfig:
    def __init__(self) -> None:
        self.jwt_secret = os.getenv("JWT_SECRET", "dev-secret-change-me")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_ttl_minutes = int(os.getenv("JWT_ACCESS_TTL_MINUTES", "30"))
        self.refresh_ttl_days = int(os.getenv("JWT_REFRESH_TTL_DAYS", "30"))


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


async def persist_refresh_token(session: AsyncSession, user_id: uuid.UUID, token: str, expires_at: datetime, user_agent: Optional[str], ip: Optional[str]) -> RefreshToken:
    rt = RefreshToken(user_id=user_id, token=token, expires_at=expires_at, revoked=False, user_agent=user_agent, ip=ip)
    session.add(rt)
    await session.flush()
    return rt


class AuthService:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession], config: Optional[AuthConfig] = None) -> None:
        self.session_factory = session_factory
        self.config = config or AuthConfig()

    # Password helpers

    def create_access_token(self, user_id: uuid.UUID, email: str) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user_id),
            "email": email,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=self.config.access_ttl_minutes)).timestamp()),
            "type": "access",
        }
        return jwt.encode(payload, self.config.jwt_secret, algorithm=self.config.jwt_algorithm)

    def create_refresh_token_string(self, user_id: uuid.UUID) -> Tuple[str, datetime]:
        now = datetime.now(timezone.utc)
        exp = now + timedelta(days=self.config.refresh_ttl_days)
        jti = str(uuid.uuid4())
        payload = {
            "sub": str(user_id),
            "jti": jti,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "type": "refresh",
        }
        token = jwt.encode(payload, self.config.jwt_secret, algorithm=self.config.jwt_algorithm)
        return token, exp

    async def register_user(self, email: str, password: str) -> User:
        async with self.session_factory() as session:
            exists = await session.execute(select(User).where(User.email == email))
            if exists.scalar_one_or_none():
                raise ValueError("Пользователь с таким email уже существует")
            user = User(email=email, password_hash=hash_password(password), is_active=True)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user
        return None

    async def authenticate_user(self, email: str, password: str) -> User:
        async with self.session_factory() as session:
            res = await session.execute(select(User).where(User.email == email))
            user = res.scalar_one_or_none()
            if not user or not user.password_hash or not verify_password(password, user.password_hash):
                raise ValueError("Неверные учетные данные")
            await session.execute(
                sa_update(User).where(User.id == user.id).values(last_login_at=datetime.now(timezone.utc))
            )
            await session.commit()
            return user
        return None

    async def issue_tokens(self, user: User, user_agent: Optional[str] = None, ip: Optional[str] = None) -> Tuple[str, str]:
        access = self.create_access_token(user.id, user.email)
        refresh, exp = self.create_refresh_token_string(user.id)
        async with self.session_factory() as session:
            await persist_refresh_token(session, user.id, refresh, exp, user_agent, ip)
            await session.commit()
        return access, refresh

    async def refresh_tokens(self, refresh_token: str, user_agent: Optional[str] = None, ip: Optional[str] = None) -> Tuple[str, str]:
        try:
            data = jwt.decode(refresh_token, self.config.jwt_secret, algorithms=[self.config.jwt_algorithm])
            if data.get("type") != "refresh":
                raise ValueError("Неверный тип токена")
        except Exception as e:
            raise ValueError("Неверный или просроченный refresh токен") from e

        user_id = uuid.UUID(data["sub"])
        async with self.session_factory() as session:
            res = await session.execute(select(RefreshToken).where(RefreshToken.token == refresh_token))
            rt = res.scalar_one_or_none()
            if not rt or rt.revoked or rt.expires_at <= datetime.now(timezone.utc):
                raise ValueError("Refresh токен недействителен")
            rt.revoked = True
            ures = await session.execute(select(User).where(User.id == user_id))
            user = ures.scalar_one_or_none()
            if not user or not user.is_active:
                raise ValueError("Пользователь недоступен")
            new_access = self.create_access_token(user.id, user.email)
            new_refresh, exp = self.create_refresh_token_string(user.id)
            await persist_refresh_token(session, user.id, new_refresh, exp, user_agent, ip)
            await session.commit()
            return new_access, new_refresh
        return None

    async def revoke_refresh(self, refresh_token: str) -> None:
        async with self.session_factory() as session:
            res = await session.execute(select(RefreshToken).where(RefreshToken.token == refresh_token))
            rt = res.scalar_one_or_none()
            if rt and not rt.revoked:
                rt.revoked = True
                await session.commit()

    def decode_access_token(self, access_token: str) -> dict:
        data = jwt.decode(access_token, self.config.jwt_secret, algorithms=[self.config.jwt_algorithm])
        if data.get("type") != "access":
            raise ValueError("Неверный тип токена")
        return data

    async def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        async with self.session_factory() as session:
            res = await session.execute(select(User).where(User.id == user_id))
            return res.scalar_one_or_none()
        return None

    async def get_or_create_telegram_user(self, telegram_id: int, email_hint: Optional[str], first_name: Optional[str], last_name: Optional[str]) -> User:
        async with self.session_factory() as session:
            res = await session.execute(select(User).where(User.telegram_id == telegram_id))
            user = res.scalar_one_or_none()
            if user:
                return user
            email = email_hint or f"tg-{telegram_id}@example.local"
            exists = await session.execute(select(User).where(User.email == email))
            if exists.scalar_one_or_none():
                email = f"tg-{telegram_id}-{uuid.uuid4().hex[:8]}@example.local"
            user = User(email=email, password_hash=None, telegram_id=telegram_id, first_name=first_name, last_name=last_name, is_active=True)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user
        return None

