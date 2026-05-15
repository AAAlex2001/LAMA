"""Тесты специфичных действий: status-only + accept/reject + dispatcher."""

from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.schemas.inbox.enums import EventStatus, EventType
from backend.services.inbox.features.actions.execute_specific_action import (
    ExecuteSpecificAction,
)
from backend.services.inbox.features.actions.handle_join_request import (
    accept_join_request,
    reject_join_request,
)
from backend.services.inbox.features.actions.status_actions import (
    ignore_event,
    mark_resolved,
    reply,
)
from backend.tests.inbox.conftest import add_event


@pytest.mark.asyncio
async def test_mark_resolved_sets_processed(db, test_user):
    event = await add_event(db, test_user.id, payload={"handled": False})
    result = await mark_resolved(db, event)
    assert result.status == "resolved"
    assert event.status == EventStatus.PROCESSED
    assert event.payload["handled"] is True


@pytest.mark.asyncio
async def test_ignore_sets_ignored(db, test_user):
    event = await add_event(db, test_user.id)
    result = await ignore_event(db, event)
    assert result.status == "ignored"
    assert event.status == EventStatus.IGNORED


@pytest.mark.asyncio
async def test_reply_returns_chat_metadata(db, test_user, test_bot):
    event = await add_event(
        db, test_user.id,
        bot_id=test_bot.id, tg_user_id=42,
        payload={"chat_id": 12345, "message_id": 7},
    )
    result = await reply(db, event)
    assert result.status == "reply"
    assert result.bot_id == test_bot.id
    assert result.tg_user_id == 42
    assert result.chat_id == 12345
    assert result.message_id == 7
    assert event.status == EventStatus.PROCESSED


@pytest.mark.asyncio
async def test_accept_join_request_approves_and_sets_state(
    db, test_user, test_bot, test_channel, fake_tg_client, monkeypatch,
):
    event = await add_event(
        db, test_user.id,
        bot_id=test_bot.id, channel_id=test_channel.id, tg_user_id=42,
        event_type=EventType.CHANNEL_JOIN_REQUEST,
        payload={"handled": False},
    )

    monkeypatch.setattr(
        "backend.services.inbox.features.actions.handle_join_request.increment_link_counter",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "backend.services.inbox.features.actions.handle_join_request.fire_join_trigger",
        AsyncMock(),
    )

    result = await accept_join_request(db, event, fake_tg_client)
    await db.commit()
    await db.refresh(event)

    assert result.status == "accepted"
    assert event.status == EventStatus.PROCESSED
    assert event.payload["join_state"] == "accepted"
    assert event.payload["handled"] is True
    fake_tg_client.approve_chat_join_request.assert_awaited_once_with(
        chat_id=test_channel.telegram_id, user_id=42,
    )


@pytest.mark.asyncio
async def test_reject_join_request_declines_and_sets_state(
    db, test_user, test_bot, test_channel, fake_tg_client, monkeypatch,
):
    event = await add_event(
        db, test_user.id,
        bot_id=test_bot.id, channel_id=test_channel.id, tg_user_id=42,
        event_type=EventType.CHANNEL_JOIN_REQUEST,
    )

    monkeypatch.setattr(
        "backend.services.inbox.features.actions.handle_join_request.fire_join_trigger",
        AsyncMock(),
    )

    result = await reject_join_request(db, event, fake_tg_client)
    await db.commit()
    await db.refresh(event)

    assert result.status == "rejected"
    assert event.payload["join_state"] == "rejected"
    fake_tg_client.decline_chat_join_request.assert_awaited_once()


@pytest.mark.asyncio
async def test_join_action_404_when_channel_missing_telegram_id(
    db, test_user, test_bot, fake_tg_client,
):
    """Канал без `telegram_id` → 404."""
    event = await add_event(
        db, test_user.id,
        bot_id=test_bot.id, channel_id=None, tg_user_id=42,
    )
    with pytest.raises(HTTPException) as exc:
        await accept_join_request(db, event, fake_tg_client)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_dispatcher_routes_to_status_action(db, test_user):
    event = await add_event(db, test_user.id)
    result = await ExecuteSpecificAction(db).execute(event=event, action_type="mark_resolved")
    assert result.status == "resolved"


@pytest.mark.asyncio
async def test_dispatcher_404_when_bot_not_found(db, test_user):
    """tg-action типа `delete_message` без бота → 404."""
    event = await add_event(db, test_user.id, bot_id=None)
    with pytest.raises(HTTPException) as exc:
        await ExecuteSpecificAction(db).execute(event=event, action_type="delete_message")
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_dispatcher_unknown_action_400(db, test_user, test_bot, monkeypatch):
    event = await add_event(db, test_user.id, bot_id=test_bot.id)
    monkeypatch.setattr(
        "backend.services.inbox.features.actions.execute_specific_action.resolve_by_token",
        lambda _: type("X", (), {})(),
    )
    with pytest.raises(HTTPException) as exc:
        await ExecuteSpecificAction(db).execute(event=event, action_type="totally_made_up")
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_dispatcher_wraps_tg_error_as_500(db, test_user, test_bot, test_channel, monkeypatch):
    event = await add_event(
        db, test_user.id,
        bot_id=test_bot.id, channel_id=test_channel.id, tg_user_id=42,
        event_type=EventType.CHANNEL_JOIN_REQUEST,
    )

    failing_client = type("X", (), {
        "approve_chat_join_request": AsyncMock(side_effect=RuntimeError("boom")),
    })()
    monkeypatch.setattr(
        "backend.services.inbox.features.actions.execute_specific_action.resolve_by_token",
        lambda _: failing_client,
    )

    with pytest.raises(HTTPException) as exc:
        await ExecuteSpecificAction(db).execute(event=event, action_type="accept")
    assert exc.value.status_code == 500
