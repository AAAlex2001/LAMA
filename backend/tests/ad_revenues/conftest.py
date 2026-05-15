"""Pytest-инфраструктура для домена ad_revenues.

Используем in-memory sqlite-aiosqlite для изоляции и скорости. На каждый тест
поднимается чистая схема + один тестовый пользователь. Celery (snapshot-задачи)
и Telegram-бот (get_chat_member_count) патчатся, чтобы тесты не уходили в сеть.
"""

from datetime import date as date_cls, datetime, timezone
from typing import AsyncIterator

import pytest
import pytest_asyncio
from asgi_lifespan import LifespanManager
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool
from sqlalchemy.sql.elements import Extract

from backend.database import get_db
from backend.models import load_models
from backend.models.auth import User, UserRole
from backend.models.base import Base
from backend.models.channels import ChannelGroup, ChannelType
from backend.routes.ad_revenues import router as ad_revenues_router
from backend.routes.auth import get_current_user


pytest_plugins = ["pytest_asyncio"]


def pytest_configure(config):
    """Регистрируем кастомные маркеры — иначе pytest пишет PytestUnknownMarkWarning.
    Делаем здесь, чтобы не зависеть от pytest.ini (он может не доехать в контейнер)."""
    config.addinivalue_line(
        "markers",
        "no_snapshot_patch: отключает autouse-подмену ScheduleAdRevenueSnapshots для теста",
    )


# Postgres-only `EXTRACT(field FROM ts)` переводим в SQLite-аналог `strftime`.
# Регистрируется глобально, но срабатывает только когда диалект — sqlite,
# так что прод (postgres) этим хуком не задет.
_EXTRACT_FORMAT = {"year": "%Y", "month": "%m", "day": "%d", "hour": "%H", "minute": "%M"}


@compiles(Extract, "sqlite")
def _sqlite_extract(element, compiler, **kw):
    fmt = _EXTRACT_FORMAT.get(element.field.lower())
    if fmt is None:
        return compiler.visit_extract(element, **kw)
    return f"CAST(strftime('{fmt}', {compiler.process(element.expr, **kw)}) AS INTEGER)"


@compiles(JSONB, "sqlite")
def _sqlite_jsonb(element, compiler, **kw):
    return "JSON"


@pytest_asyncio.fixture
async def engine():
    """SQLite in-memory с одним общим соединением через StaticPool.

    Иначе разные AsyncSession открыли бы независимые in-memory БД и не видели
    бы данные друг друга — критично для интеграционных тестов, где фикстура
    кладёт строки своим сессионом, а роут читает их своим.
    """
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


@pytest_asyncio.fixture
async def test_user(db: AsyncSession) -> User:
    user = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_channel(db: AsyncSession, test_user: User) -> ChannelGroup:
    channel = ChannelGroup(
        owner_id=test_user.id,
        telegram_id=-1001234567890,
        channel_type=ChannelType.CHANNEL,
        title="Test Channel",
        username="testchannel",
    )
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return channel


@pytest.fixture(autouse=True)
def patch_snapshot_side_effects(request, monkeypatch):
    """Глушим побочные эффекты CreateAdRevenue: celery-задачи и сетевой вызов в Telegram.

    Тест может отказаться от этой подмены маркером `@pytest.mark.no_snapshot_patch`,
    если он сам проверяет реальную логику ScheduleAdRevenueSnapshots.
    """
    if "no_snapshot_patch" in request.keywords:
        return

    async def fake_execute(self, ad_revenue):
        from backend.services.ad_revenues.features.schedule_ad_revenue_snapshots import (
            ScheduledSnapshots,
        )
        return ScheduledSnapshots(baseline=None, deferred_count=0)

    monkeypatch.setattr(
        "backend.services.ad_revenues.features.create_ad_revenue.ScheduleAdRevenueSnapshots.execute",
        fake_execute,
    )


@pytest_asyncio.fixture
async def app(session_factory, test_user) -> FastAPI:
    """Минимальный FastAPI app: только роутер ad_revenues + overrides."""
    app = FastAPI()
    app.include_router(ad_revenues_router, prefix="/api")

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                if session.in_transaction():
                    await session.commit()
            except BaseException:
                await session.rollback()
                raise

    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    return app


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


@pytest.fixture
def today() -> date_cls:
    return date_cls.today()


@pytest.fixture
def utcnow() -> datetime:
    return datetime.now(timezone.utc)
