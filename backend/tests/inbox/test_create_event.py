"""Тесты CreateInboxEvent."""

import pytest

from backend.schemas.inbox.enums import EntityType, EventStatus, EventType, InboxCategory
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.inbox.features.create_event import CreateInboxEvent


@pytest.mark.asyncio
async def test_create_writes_row(db, test_user):
    data = InboxEventCreate(
        owner_id=test_user.id,
        category=InboxCategory.SYSTEM,
        entity_type=EntityType.CHANNEL,
        event_type=EventType.CHANNEL_JOIN_REQUEST,
        status=EventStatus.NEW,
        description="join from user",
        payload={"link_url": "https://t.me/+abc"},
    )

    event = await CreateInboxEvent(db).execute(data)
    await db.commit()

    assert event.id is not None
    assert event.owner_id == test_user.id
    assert event.event_type == EventType.CHANNEL_JOIN_REQUEST
    assert event.payload["link_url"] == "https://t.me/+abc"


@pytest.mark.asyncio
async def test_create_defaults_status_to_new(db, test_user):
    data = InboxEventCreate(
        owner_id=test_user.id,
        category=InboxCategory.SYSTEM,
        entity_type=EntityType.CHANNEL,
        event_type=EventType.SYSTEM_NOTIFICATION,
        description="test",
        payload={},
    )

    event = await CreateInboxEvent(db).execute(data)
    await db.commit()
    assert event.status == EventStatus.NEW
