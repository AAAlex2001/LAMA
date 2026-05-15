"""Фикстуры inbox: sqlite + базовые user/bot/channel + InboxEvent-фабрика."""

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
from backend.models.channels import ChannelGroup, ChannelType
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EntityType, EventStatus, EventType, InboxCategory


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


async def add_event(
    db: AsyncSession,
    owner_id: int,
    *,
    bot_id: int | None = None,
    channel_id: int | None = None,
    category: InboxCategory = InboxCategory.SYSTEM,
    entity_type: EntityType = EntityType.CHANNEL,
    event_type: EventType = EventType.CHANNEL_JOIN_REQUEST,
    status: EventStatus = EventStatus.NEW,
    tg_user_id: int | None = None,
    payload: dict | None = None,
    description: str = "test event",
) -> InboxEvent:
    event = InboxEvent(
        owner_id=owner_id,
        bot_id=bot_id,
        channel_id=channel_id,
        category=category,
        entity_type=entity_type,
        event_type=event_type,
        status=status,
        tg_user_id=tg_user_id,
        description=description,
        payload=payload or {},
        created_at=datetime.now(timezone.utc),
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@pytest.fixture
def fake_tg_client():
    """Фейковый Telegram-клиент для inbox actions."""
    return SimpleNamespace(
        ban_chat_member=AsyncMock(return_value=True),
        unban_chat_member=AsyncMock(return_value=True),
        approve_chat_join_request=AsyncMock(return_value=True),
        decline_chat_join_request=AsyncMock(return_value=True),
        delete_message=AsyncMock(return_value=True),
        restrict_chat_member=AsyncMock(return_value=True),
    )
