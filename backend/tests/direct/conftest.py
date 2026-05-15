"""Фикстуры direct: sqlite + user/bot/chat + фейковый ws_manager."""

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

from backend.models import load_models
from backend.models.auth import User, UserRole
from backend.models.base import Base
from backend.models.bots import Bot, BotStatus
from backend.models.direct import DirectChat


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
async def test_chat(db: AsyncSession, test_bot: Bot) -> DirectChat:
    chat = DirectChat(
        bot_id=test_bot.id,
        tg_chat_id=555000111,
        tg_user_id=555000111,
        tg_username="subscriber",
        tg_first_name="Sub",
    )
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat


@pytest.fixture(autouse=True)
def mute_ws_broadcast(monkeypatch):
    """Глушит все ws_manager.broadcast_* во всех тестах."""
    fake_manager = SimpleNamespace(
        broadcast=AsyncMock(),
        broadcast_chat_update=AsyncMock(),
        broadcast_message_new=AsyncMock(),
        broadcast_message_edited=AsyncMock(),
        broadcast_message_deleted=AsyncMock(),
        connect=AsyncMock(),
        disconnect=lambda *_: None,
    )
    monkeypatch.setattr("backend.websockets.manager.ws_manager", fake_manager)
    return fake_manager


@pytest.fixture
def fake_tg_bot():
    """Фейковый aiogram-бот для send/edit/delete операций."""
    return SimpleNamespace(
        send_message=AsyncMock(return_value=SimpleNamespace(message_id=100, message_thread_id=None, from_user=None)),
        send_photo=AsyncMock(return_value=SimpleNamespace(message_id=101, message_thread_id=None)),
        send_video=AsyncMock(return_value=SimpleNamespace(message_id=102, message_thread_id=None)),
        send_document=AsyncMock(return_value=SimpleNamespace(message_id=103, message_thread_id=None)),
        send_media_group=AsyncMock(return_value=[
            SimpleNamespace(message_id=200, message_thread_id=None),
            SimpleNamespace(message_id=201, message_thread_id=None),
        ]),
        edit_message_text=AsyncMock(return_value=True),
        edit_message_caption=AsyncMock(return_value=True),
        delete_message=AsyncMock(return_value=True),
        get_chat=AsyncMock(),
    )
