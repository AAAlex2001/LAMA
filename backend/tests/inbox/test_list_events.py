"""Тесты `ListInboxEvents`: фильтры + пагинация + bot_map."""

import pytest

from backend.schemas.inbox.enums import EventStatus, EventType, InboxCategory, SortDir
from backend.services.inbox.features.list_events import ListInboxEvents
from backend.tests.inbox.conftest import add_event


@pytest.mark.asyncio
async def test_returns_owner_events_only(db, test_user):
    from backend.models.auth import User, UserRole
    other = User(role=UserRole.USER, is_active=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)

    await add_event(db, test_user.id)
    await add_event(db, other.id)

    items, total, _ = await ListInboxEvents(db).execute(owner_id=test_user.id)
    assert total == 1
    assert items[0].owner_id == test_user.id


@pytest.mark.asyncio
async def test_category_filter(db, test_user):
    await add_event(db, test_user.id, category=InboxCategory.SYSTEM)
    await add_event(db, test_user.id, category=InboxCategory.AUTOMATION,
                    event_type=EventType.SYSTEM_TRIGGER)

    items, total, _ = await ListInboxEvents(db).execute(
        owner_id=test_user.id, category=InboxCategory.AUTOMATION,
    )
    assert total == 1
    assert items[0].category == InboxCategory.AUTOMATION


@pytest.mark.asyncio
async def test_status_filter(db, test_user):
    await add_event(db, test_user.id, status=EventStatus.NEW)
    await add_event(db, test_user.id, status=EventStatus.PROCESSED)
    await add_event(db, test_user.id, status=EventStatus.IGNORED)

    items, total, _ = await ListInboxEvents(db).execute(
        owner_id=test_user.id, status=EventStatus.NEW,
    )
    assert total == 1
    assert items[0].status == EventStatus.NEW


@pytest.mark.asyncio
async def test_bot_ids_filter(db, test_user, test_bot):
    await add_event(db, test_user.id, bot_id=test_bot.id)
    await add_event(db, test_user.id, bot_id=None)

    items, total, _ = await ListInboxEvents(db).execute(
        owner_id=test_user.id, bot_ids=[test_bot.id],
    )
    assert total == 1


@pytest.mark.asyncio
async def test_event_types_filter(db, test_user):
    await add_event(db, test_user.id, event_type=EventType.CHANNEL_JOIN_REQUEST)
    await add_event(db, test_user.id, event_type=EventType.CHANNEL_LINK_JOIN)
    await add_event(db, test_user.id, event_type=EventType.BOT_COMMAND,
                    category=InboxCategory.AUTOMATION)

    items, total, _ = await ListInboxEvents(db).execute(
        owner_id=test_user.id,
        event_types=[EventType.CHANNEL_JOIN_REQUEST, EventType.CHANNEL_LINK_JOIN],
    )
    assert total == 2


@pytest.mark.asyncio
async def test_pagination(db, test_user):
    for _ in range(10):
        await add_event(db, test_user.id)

    page1, total, _ = await ListInboxEvents(db).execute(
        owner_id=test_user.id, limit=3, offset=0,
    )
    page2, _, _ = await ListInboxEvents(db).execute(
        owner_id=test_user.id, limit=3, offset=3,
    )

    assert total == 10
    assert len(page1) == 3
    assert {e.id for e in page1} & {e.id for e in page2} == set()


@pytest.mark.asyncio
async def test_sort_old_first(db, test_user):
    first = await add_event(db, test_user.id, description="first")
    second = await add_event(db, test_user.id, description="second")

    items_new, _, _ = await ListInboxEvents(db).execute(
        owner_id=test_user.id, sort_dir=SortDir.NEW_FIRST,
    )
    items_old, _, _ = await ListInboxEvents(db).execute(
        owner_id=test_user.id, sort_dir=SortDir.OLD_FIRST,
    )

    assert items_new[0].id == second.id
    assert items_old[0].id == first.id


@pytest.mark.asyncio
async def test_system_flag_includes_system_event_types(db, test_user):
    await add_event(db, test_user.id, event_type=EventType.CHANNEL_JOIN_REQUEST,
                    category=InboxCategory.SYSTEM)
    await add_event(db, test_user.id, event_type=EventType.BOT_COMMAND,
                    category=InboxCategory.AUTOMATION)

    items, total, _ = await ListInboxEvents(db).execute(
        owner_id=test_user.id, include_system=True,
    )
    assert total >= 1
    assert all(e.event_type in {
        EventType.SYSTEM_NOTIFICATION, EventType.SYSTEM_UPDATE,
        EventType.CHANNEL_JOIN_REQUEST, EventType.CHANNEL_LINK_JOIN,
        EventType.CHANNEL_BAN, EventType.BOT_ERROR,
    } for e in items)


@pytest.mark.asyncio
async def test_type_auto_replies_filter(db, test_user):
    await add_event(db, test_user.id, event_type=EventType.SYSTEM_AUTOREPLY,
                    category=InboxCategory.AUTOMATION)
    await add_event(db, test_user.id, event_type=EventType.SYSTEM_TRIGGER,
                    category=InboxCategory.AUTOMATION)

    items, total, _ = await ListInboxEvents(db).execute(
        owner_id=test_user.id, type_auto_replies=True,
    )
    assert total == 1
    assert items[0].event_type == EventType.SYSTEM_AUTOREPLY


@pytest.mark.asyncio
async def test_bot_map_loaded(db, test_user, test_bot):
    await add_event(db, test_user.id, bot_id=test_bot.id)

    _, _, bot_map = await ListInboxEvents(db).execute(owner_id=test_user.id)
    assert test_bot.id in bot_map
    assert bot_map[test_bot.id].tg_bot_username == test_bot.username


@pytest.mark.asyncio
async def test_bot_map_empty_when_no_bot_events(db, test_user):
    await add_event(db, test_user.id, bot_id=None)
    _, _, bot_map = await ListInboxEvents(db).execute(owner_id=test_user.id)
    assert bot_map == {}
