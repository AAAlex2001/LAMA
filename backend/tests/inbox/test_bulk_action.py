"""Тесты `ExecuteBulkAction` — READ / IGNORE / DELETE + BLOCK/UNBLOCK с мок-Bot."""

from unittest.mock import AsyncMock

import pytest
from aiogram.exceptions import TelegramAPIError

from backend.models.direct import DirectChat
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import BulkActionType, EventStatus
from backend.services.inbox.features.execute_bulk_action import ExecuteBulkAction
from backend.tests.inbox.conftest import add_event


@pytest.mark.asyncio
async def test_read_marks_processed(db, test_user):
    e1 = await add_event(db, test_user.id, status=EventStatus.NEW)
    e2 = await add_event(db, test_user.id, status=EventStatus.NEW)

    affected = await ExecuteBulkAction(db).execute(
        owner_id=test_user.id, event_ids=[e1.id, e2.id], action=BulkActionType.READ,
    )
    await db.commit()
    await db.refresh(e1)
    await db.refresh(e2)

    assert affected == 2
    assert e1.status == EventStatus.PROCESSED
    assert e2.status == EventStatus.PROCESSED


@pytest.mark.asyncio
async def test_ignore_marks_ignored(db, test_user):
    event = await add_event(db, test_user.id)
    affected = await ExecuteBulkAction(db).execute(
        owner_id=test_user.id, event_ids=[event.id], action=BulkActionType.IGNORE,
    )
    await db.commit()
    await db.refresh(event)
    assert affected == 1
    assert event.status == EventStatus.IGNORED


@pytest.mark.asyncio
async def test_delete_removes_row(db, test_user):
    event = await add_event(db, test_user.id)
    event_id = event.id

    affected = await ExecuteBulkAction(db).execute(
        owner_id=test_user.id, event_ids=[event_id], action=BulkActionType.DELETE,
    )
    await db.commit()

    found = await db.get(InboxEvent, event_id)
    assert affected == 1
    assert found is None


@pytest.mark.asyncio
async def test_apply_to_all_targets_owner_events(db, test_user):
    for _ in range(3):
        await add_event(db, test_user.id)

    affected = await ExecuteBulkAction(db).execute(
        owner_id=test_user.id, event_ids=[], action=BulkActionType.READ, apply_to_all=True,
    )
    await db.commit()
    assert affected == 3


@pytest.mark.asyncio
async def test_returns_zero_for_empty_ids(db, test_user):
    affected = await ExecuteBulkAction(db).execute(
        owner_id=test_user.id, event_ids=[], action=BulkActionType.READ, apply_to_all=False,
    )
    assert affected == 0


@pytest.mark.asyncio
async def test_block_for_channel_event_calls_ban(db, test_user, test_bot, test_channel, monkeypatch):
    event = await add_event(
        db, test_user.id,
        bot_id=test_bot.id, channel_id=test_channel.id, tg_user_id=42,
    )

    fake_client = type("Client", (), {"ban_chat_member": AsyncMock()})()
    monkeypatch.setattr(
        "backend.services.inbox.features.execute_bulk_action.resolve_by_token",
        lambda _: fake_client,
    )

    affected = await ExecuteBulkAction(db).execute(
        owner_id=test_user.id, event_ids=[event.id], action=BulkActionType.BLOCK,
    )
    await db.commit()
    await db.refresh(event)

    assert affected == 1
    assert event.status == EventStatus.BANNED
    fake_client.ban_chat_member.assert_awaited_once_with(test_channel.telegram_id, 42)


@pytest.mark.asyncio
async def test_block_swallows_tg_error(db, test_user, test_bot, test_channel, monkeypatch):
    event = await add_event(
        db, test_user.id,
        bot_id=test_bot.id, channel_id=test_channel.id, tg_user_id=42,
    )

    fake_client = type("Client", (), {
        "ban_chat_member": AsyncMock(side_effect=TelegramAPIError(method=None, message="boom")),
    })()
    monkeypatch.setattr(
        "backend.services.inbox.features.execute_bulk_action.resolve_by_token",
        lambda _: fake_client,
    )

    affected = await ExecuteBulkAction(db).execute(
        owner_id=test_user.id, event_ids=[event.id], action=BulkActionType.BLOCK,
    )
    await db.commit()
    await db.refresh(event)

    assert affected == 0
    assert event.status != EventStatus.BANNED


@pytest.mark.asyncio
async def test_block_for_dm_event_sets_chat_blocked(db, test_user, test_bot):
    dm = DirectChat(bot_id=test_bot.id, tg_chat_id=12345, is_blocked=False)
    db.add(dm)
    await db.commit()

    event = await add_event(
        db, test_user.id,
        bot_id=test_bot.id, channel_id=None, tg_user_id=12345,
        payload={"chat_id": 12345},
    )

    affected = await ExecuteBulkAction(db).execute(
        owner_id=test_user.id, event_ids=[event.id], action=BulkActionType.BLOCK,
    )
    await db.commit()
    await db.refresh(dm)
    await db.refresh(event)

    assert affected == 1
    assert dm.is_blocked is True
    assert event.status == EventStatus.BANNED


@pytest.mark.asyncio
async def test_unblock_calls_unban(db, test_user, test_bot, test_channel, monkeypatch):
    event = await add_event(
        db, test_user.id,
        bot_id=test_bot.id, channel_id=test_channel.id, tg_user_id=42,
        status=EventStatus.BANNED,
    )

    fake_client = type("Client", (), {"unban_chat_member": AsyncMock()})()
    monkeypatch.setattr(
        "backend.services.inbox.features.execute_bulk_action.resolve_by_token",
        lambda _: fake_client,
    )

    affected = await ExecuteBulkAction(db).execute(
        owner_id=test_user.id, event_ids=[event.id], action=BulkActionType.UNBLOCK,
    )
    await db.commit()
    await db.refresh(event)

    assert affected == 1
    assert event.status == EventStatus.PROCESSED
    fake_client.unban_chat_member.assert_awaited_once()


@pytest.mark.asyncio
async def test_unblock_swallows_tg_error(db, test_user, test_bot, test_channel, monkeypatch):
    event = await add_event(
        db, test_user.id,
        bot_id=test_bot.id, channel_id=test_channel.id, tg_user_id=42,
    )

    fake_client = type("Client", (), {
        "unban_chat_member": AsyncMock(side_effect=TelegramAPIError(method=None, message="boom")),
    })()
    monkeypatch.setattr(
        "backend.services.inbox.features.execute_bulk_action.resolve_by_token",
        lambda _: fake_client,
    )

    affected = await ExecuteBulkAction(db).execute(
        owner_id=test_user.id, event_ids=[event.id], action=BulkActionType.UNBLOCK,
    )
    assert affected == 0


@pytest.mark.asyncio
async def test_block_skips_event_without_required_fields(db, test_user, test_bot, monkeypatch):
    event = await add_event(
        db, test_user.id,
        bot_id=test_bot.id, channel_id=None, tg_user_id=None, payload={},
    )

    monkeypatch.setattr(
        "backend.services.inbox.features.execute_bulk_action.resolve_by_token",
        lambda _: type("X", (), {})(),
    )

    affected = await ExecuteBulkAction(db).execute(
        owner_id=test_user.id, event_ids=[event.id], action=BulkActionType.BLOCK,
    )
    await db.refresh(event)
    assert affected == 1
    assert event.status == EventStatus.BANNED
