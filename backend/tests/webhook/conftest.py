"""Pytest-инфраструктура для домена webhook.

Зеркало conftest других доменов + хелперы для aiogram-моков:
- fake_bot — SimpleNamespace со всеми нужными методами как AsyncMock
- make_update / make_message / make_callback_query / make_chat_join_request
"""

from datetime import datetime, timezone
from types import SimpleNamespace
from typing import AsyncIterator
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool
from sqlalchemy.sql.elements import Extract

from backend.models import load_models
from backend.models.auth import User, UserRole
from backend.models.base import Base
from backend.models.bots import Bot, BotStatus
from backend.models.channels import ChannelGroup, ChannelType


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
    try:
        parsed = datetime.fromisoformat(value) if isinstance(value, str) else value
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
        telegram_id=99887766,
        username="testbot",
        first_name="Test Bot",
        token="999:fake_test_token",
        status=BotStatus.ACTIVE,
    )
    db.add(bot)
    await db.commit()
    await db.refresh(bot)
    return bot


@pytest_asyncio.fixture
async def test_channel(db: AsyncSession, test_user: User, test_bot: Bot) -> ChannelGroup:
    channel = ChannelGroup(
        owner_id=test_user.id,
        bot_id=test_bot.id,
        telegram_id=-1001234567890,
        channel_type=ChannelType.SUPERGROUP,
        title="Test Group",
        username="testgroup",
    )
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return channel


@pytest.fixture
def fake_bot():
    """Фейковый RateLimitedBot — все методы это AsyncMock, возвращают True/None."""
    inner = SimpleNamespace(
        send_message=AsyncMock(return_value=SimpleNamespace(message_id=42)),
        send_photo=AsyncMock(return_value=SimpleNamespace(message_id=43)),
        delete_message=AsyncMock(return_value=True),
        ban_chat_member=AsyncMock(return_value=True),
        unban_chat_member=AsyncMock(return_value=True),
        restrict_chat_member=AsyncMock(return_value=True),
        kick_chat_member=AsyncMock(return_value=True),
        get_chat_member=AsyncMock(),
        get_chat=AsyncMock(),
        get_webhook_info=AsyncMock(),
        set_webhook=AsyncMock(return_value=True),
        delete_webhook=AsyncMock(return_value=True),
        approve_chat_join_request=AsyncMock(return_value=True),
        decline_chat_join_request=AsyncMock(return_value=True),
        answer_callback_query=AsyncMock(return_value=True),
        edit_message_text=AsyncMock(),
        edit_message_reply_markup=AsyncMock(),
    )
    return SimpleNamespace(bot=inner, **vars(inner))
