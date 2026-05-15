"""Фикстуры для домена auth: in-memory sqlite + AuthSettings + test_user."""

from typing import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

from backend.models import load_models
from backend.models.auth import User, UserRole
from backend.models.base import Base
from backend.services.auth.settings import AuthSettings


pytest_plugins = ["pytest_asyncio"]


@compiles(JSONB, "sqlite")
def _sqlite_jsonb(element, compiler, **kw):
    return "JSON"


@pytest_asyncio.fixture
async def engine():
    load_models()
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def session_factory(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def db(session_factory) -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session


@pytest.fixture
def auth_settings() -> AuthSettings:
    return AuthSettings(
        bot_token="123456:TEST_BOT_TOKEN",
        jwt_secret="test-secret-key-for-jwt-signing",
        jwt_algorithm="HS256",
        access_token_expire_minutes=60,
        refresh_token_expire_days=7,
    )


@pytest_asyncio.fixture
async def test_user(db: AsyncSession) -> User:
    user = User(
        role=UserRole.USER,
        is_active=True,
        agree_personal_data=True,
        agree_terms=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db: AsyncSession) -> User:
    user = User(
        role=UserRole.ADMIN,
        is_active=True,
        agree_personal_data=True,
        agree_terms=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
