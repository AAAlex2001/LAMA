"""Pytest-инфраструктура для домена bot.

Зеркало conftest из channel: in-memory sqlite + StaticPool, минимальный FastAPI
с роутером bots + override get_db / get_current_user. Webhook-операции и
fetch_bot_info замоканы autouse-фикстурой, чтобы тесты не уходили в сеть.
"""

from datetime import date as date_cls, datetime, timezone
from types import SimpleNamespace
from typing import AsyncIterator
from unittest.mock import AsyncMock

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
from backend.models.bots import Bot, BotStatus
from backend.routes.auth import get_current_user


pytest_plugins = ["pytest_asyncio"]


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


def _pg_timezone_noop(_tz, value):
    return value


def _pg_to_char(value, fmt):
    if value is None:
        return None
    from datetime import datetime as _dt
    try:
        parsed = _dt.fromisoformat(value) if isinstance(value, str) else value
    except Exception:
        return value
    if fmt == "HH24:MI":
        return parsed.strftime("%H:%M")
    return str(parsed)


@pytest_asyncio.fixture
async def engine():
    from sqlalchemy import event

    load_models()
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine.sync_engine, "connect")
    def _on_connect(dbapi_connection, _record):
        dbapi_connection.create_function("timezone", 2, _pg_timezone_noop)
        dbapi_connection.create_function("to_char", 2, _pg_to_char)

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
async def test_bot(db: AsyncSession, test_user: User) -> Bot:
    bot = Bot(
        owner_id=test_user.id,
        telegram_id=12345,
        username="testbot",
        first_name="Test Bot",
        token="123:abc",
        status=BotStatus.ACTIVE,
    )
    db.add(bot)
    await db.commit()
    await db.refresh(bot)
    return bot


@pytest.fixture(autouse=True)
def stub_webhook_calls(monkeypatch):
    """Глушим SetWebhook/DeleteWebhook чтобы тесты не уходили в Telegram."""
    async def fake_set_webhook(self, token):
        return f"https://test/webhook/{token[:6]}"

    async def fake_delete_webhook(self, token):
        return True

    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.SetWebhook.execute",
        fake_set_webhook,
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.delete_webhook.DeleteWebhook.execute",
        fake_delete_webhook,
    )


@pytest.fixture
def fake_bot_info():
    """Возвращает фейковый ответ Telegram getMe."""
    return SimpleNamespace(
        id=987654321,
        username="mocked_bot",
        first_name="Mocked Bot",
    )


@pytest_asyncio.fixture
async def app(session_factory, test_user) -> FastAPI:
    from backend.routes.bots import router as bots_router

    app = FastAPI()
    app.include_router(bots_router, prefix="/api")

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
