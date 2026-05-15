"""Тесты для subscriptions: HasRecentJoinEvent, FindInviteLinkFromInbox, MarkJoinRequestAccepted."""

from datetime import datetime, timedelta, timezone

import pytest

from backend.models.channels import ChannelGroup, ChannelType
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EntityType, EventStatus, EventType, InboxCategory
from backend.services.webhook.features.subscriptions.find_invite_link_from_inbox import (
    FindInviteLinkFromInbox,
)
from backend.services.webhook.features.subscriptions.has_recent_join_event import (
    HasRecentJoinEvent,
)
from backend.services.webhook.features.subscriptions.mark_join_request_accepted import (
    MarkJoinRequestAccepted,
)


async def add_join_event(db, *, channel_id, tg_user_id, link_url=None, minutes_ago=0, owner_id=1, bot_id=1):
    event = InboxEvent(
        owner_id=owner_id,
        bot_id=bot_id,
        channel_id=channel_id,
        tg_user_id=tg_user_id,
        category=InboxCategory.SYSTEM,
        entity_type=EntityType.CHANNEL,
        event_type=EventType.CHANNEL_JOIN_REQUEST,
        status=EventStatus.NEW,
        description="join request",
        payload={"link_url": link_url} if link_url else {},
        created_at=datetime.now(timezone.utc) - timedelta(minutes=minutes_ago),
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@pytest.mark.asyncio
async def test_has_recent_returns_false_for_no_channel(db):
    result = await HasRecentJoinEvent().execute(db, user_id=42, channel_id=None)
    assert result is False


@pytest.mark.asyncio
async def test_has_recent_returns_true_for_event_within_window(db, test_channel):
    await add_join_event(
        db, channel_id=test_channel.id, tg_user_id=42, minutes_ago=1,
        owner_id=test_channel.owner_id, bot_id=test_channel.bot_id,
    )

    result = await HasRecentJoinEvent().execute(db, user_id=42, channel_id=test_channel.id)
    assert result is True


@pytest.mark.asyncio
async def test_has_recent_returns_false_for_event_older_than_window(db, test_channel):
    await add_join_event(
        db, channel_id=test_channel.id, tg_user_id=42, minutes_ago=10,
        owner_id=test_channel.owner_id, bot_id=test_channel.bot_id,
    )

    result = await HasRecentJoinEvent().execute(db, user_id=42, channel_id=test_channel.id)
    assert result is False


@pytest.mark.asyncio
async def test_has_recent_returns_false_for_different_user(db, test_channel):
    await add_join_event(
        db, channel_id=test_channel.id, tg_user_id=42, minutes_ago=1,
        owner_id=test_channel.owner_id, bot_id=test_channel.bot_id,
    )

    result = await HasRecentJoinEvent().execute(db, user_id=999, channel_id=test_channel.id)
    assert result is False


@pytest.mark.asyncio
async def test_find_invite_link_returns_link(db, test_channel):
    await add_join_event(
        db, channel_id=test_channel.id, tg_user_id=42,
        link_url="https://t.me/+inviteABC",
        owner_id=test_channel.owner_id, bot_id=test_channel.bot_id,
    )

    link = await FindInviteLinkFromInbox().execute(
        db, user_id=42, telegram_chat_id=test_channel.telegram_id,
    )
    assert link == "https://t.me/+inviteABC"


@pytest.mark.asyncio
async def test_find_invite_link_returns_latest(db, test_channel):
    """Если несколько событий — берётся последнее по id."""
    await add_join_event(
        db, channel_id=test_channel.id, tg_user_id=42,
        link_url="https://t.me/+old",
        owner_id=test_channel.owner_id, bot_id=test_channel.bot_id,
    )
    await add_join_event(
        db, channel_id=test_channel.id, tg_user_id=42,
        link_url="https://t.me/+new",
        owner_id=test_channel.owner_id, bot_id=test_channel.bot_id,
    )

    link = await FindInviteLinkFromInbox().execute(
        db, user_id=42, telegram_chat_id=test_channel.telegram_id,
    )
    assert link == "https://t.me/+new"


@pytest.mark.asyncio
async def test_find_invite_link_returns_none_for_unknown_channel(db):
    link = await FindInviteLinkFromInbox().execute(
        db, user_id=42, telegram_chat_id=-9999999999,
    )
    assert link is None


@pytest.mark.asyncio
async def test_find_invite_link_returns_none_when_no_event(db, test_channel):
    link = await FindInviteLinkFromInbox().execute(
        db, user_id=42, telegram_chat_id=test_channel.telegram_id,
    )
    assert link is None


@pytest.mark.asyncio
async def test_mark_join_accepted_updates_event(db, test_channel):
    event = await add_join_event(
        db, channel_id=test_channel.id, tg_user_id=42,
        owner_id=test_channel.owner_id, bot_id=test_channel.bot_id,
    )

    await MarkJoinRequestAccepted(db).execute(
        user_id=42, chat_id=test_channel.telegram_id,
    )
    await db.commit()
    await db.refresh(event)

    assert event.status == EventStatus.PROCESSED
    assert event.payload["join_state"] == "accepted"


@pytest.mark.asyncio
async def test_mark_join_accepted_noop_for_unknown_channel(db):
    """Если канал не найден — просто молча выходим."""
    await MarkJoinRequestAccepted(db).execute(user_id=42, chat_id=-9999999999)


@pytest.mark.asyncio
async def test_mark_join_accepted_noop_for_no_event(db, test_channel):
    """Канал есть, но события нет — выход без ошибки."""
    await MarkJoinRequestAccepted(db).execute(
        user_id=999, chat_id=test_channel.telegram_id,
    )
