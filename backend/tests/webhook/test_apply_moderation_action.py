"""Тесты ApplyModerationAction — оркестратор: проверки → действие → удаление → событие."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest

from backend.models.channels import ActionType
from backend.services.rate_limiter import RateLimitTimeout
from backend.services.webhook.features.moderation.apply_moderation_action import (
    ApplyModerationAction,
)


@pytest.fixture
def stub_helpers(monkeypatch, fake_bot):
    """Заменяем все вспомогательные сервисы на моки и фиксируем их вызовы."""
    calls = {}

    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.apply_moderation_action.resolve_for_bot_id",
        AsyncMock(return_value=fake_bot),
    )

    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.apply_moderation_action.is_banned",
        AsyncMock(return_value=False),
    )
    mark = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.apply_moderation_action.mark_banned",
        mark,
    )
    calls["mark_banned"] = mark

    check_admin = AsyncMock(return_value=False)
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.apply_moderation_action.CheckModerationAdmin",
        lambda: SimpleNamespace(execute=check_admin),
    )
    calls["check_admin"] = check_admin

    delete_msg = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.apply_moderation_action.DeleteModeratedMessage",
        lambda: SimpleNamespace(execute=delete_msg),
    )
    calls["delete_msg"] = delete_msg

    ban = AsyncMock()
    mute = AsyncMock()
    kick = AsyncMock()
    unmute = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.apply_moderation_action.BanUser",
        lambda: SimpleNamespace(execute=ban),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.apply_moderation_action.MuteUser",
        lambda: SimpleNamespace(execute=mute),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.apply_moderation_action.KickUser",
        lambda: SimpleNamespace(execute=kick),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.apply_moderation_action.UnmuteUser",
        lambda: SimpleNamespace(execute=unmute),
    )
    calls["ban"] = ban
    calls["mute"] = mute
    calls["kick"] = kick
    calls["unmute"] = unmute

    event = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.apply_moderation_action.CreateModerationEvent",
        lambda db, bot: SimpleNamespace(execute=event),
    )
    calls["event"] = event

    return calls


@pytest.mark.asyncio
async def test_returns_no_bot_when_bot_id_unknown(db, stub_helpers):
    result = await ApplyModerationAction(db).execute(
        bot_id=99999, chat_id=-100, message_id=1, user_id=10, username="u",
        message_text="x", action=ActionType.BAN, mute_duration=None,
        reason="r", reason_source="s", reason_context=None,
    )
    assert result.startswith("no_bot:")


@pytest.mark.asyncio
async def test_returns_no_channel_when_chat_unknown(db, test_bot, stub_helpers):
    result = await ApplyModerationAction(db).execute(
        bot_id=test_bot.id, chat_id=-99999999, message_id=1, user_id=10, username="u",
        message_text="x", action=ActionType.BAN, mute_duration=None,
        reason="r", reason_source="s", reason_context=None,
    )
    assert result.startswith("no_channel:")


@pytest.mark.asyncio
async def test_ban_action_applies_and_records_event(db, test_bot, test_channel, stub_helpers):
    result = await ApplyModerationAction(db).execute(
        bot_id=test_bot.id, chat_id=test_channel.telegram_id, message_id=1,
        user_id=10, username="u", message_text="bad",
        action=ActionType.BAN, mute_duration=None,
        reason="link", reason_source="channel_link_filter", reason_context=None,
    )

    assert result == "ok"
    stub_helpers["ban"].assert_awaited_once()
    stub_helpers["delete_msg"].assert_awaited_once()
    stub_helpers["mark_banned"].assert_awaited_once()
    stub_helpers["event"].assert_awaited_once()


@pytest.mark.asyncio
async def test_mute_action_passes_duration(db, test_bot, test_channel, stub_helpers):
    await ApplyModerationAction(db).execute(
        bot_id=test_bot.id, chat_id=test_channel.telegram_id, message_id=1,
        user_id=10, username="u", message_text="spam",
        action=ActionType.MUTE, mute_duration=30,
        reason="flood", reason_source="channel_flood_settings", reason_context=None,
    )
    args = stub_helpers["mute"].call_args
    assert args.args[3] == 30  # mute_duration


@pytest.mark.asyncio
async def test_kick_action(db, test_bot, test_channel, stub_helpers):
    await ApplyModerationAction(db).execute(
        bot_id=test_bot.id, chat_id=test_channel.telegram_id, message_id=1,
        user_id=10, username="u", message_text="x",
        action=ActionType.KICK, mute_duration=None,
        reason="r", reason_source="s", reason_context=None,
    )
    stub_helpers["kick"].assert_awaited_once()


@pytest.mark.asyncio
async def test_admin_user_skipped(db, test_bot, test_channel, stub_helpers):
    """Если юзер админ — модерационное действие НЕ применяется, только удаление сообщения."""
    stub_helpers["check_admin"].return_value = True

    result = await ApplyModerationAction(db).execute(
        bot_id=test_bot.id, chat_id=test_channel.telegram_id, message_id=1,
        user_id=10, username="admin", message_text="x",
        action=ActionType.BAN, mute_duration=None,
        reason="r", reason_source="s", reason_context=None,
    )

    assert result == "admin_skipped"
    stub_helpers["ban"].assert_not_called()
    stub_helpers["mark_banned"].assert_not_called()
    stub_helpers["event"].assert_not_called()
    stub_helpers["delete_msg"].assert_awaited()


@pytest.mark.asyncio
async def test_already_banned_only_deletes_message(db, test_bot, test_channel, stub_helpers, monkeypatch):
    """Если уже забанен — только удаляем сообщение, без повторного бана и события."""
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.apply_moderation_action.is_banned",
        AsyncMock(return_value=True),
    )

    result = await ApplyModerationAction(db).execute(
        bot_id=test_bot.id, chat_id=test_channel.telegram_id, message_id=1,
        user_id=10, username="u", message_text="x",
        action=ActionType.BAN, mute_duration=None,
        reason="r", reason_source="s", reason_context=None,
    )

    assert result == "deleted_only"
    stub_helpers["ban"].assert_not_called()
    stub_helpers["mark_banned"].assert_not_called()
    stub_helpers["event"].assert_not_called()


@pytest.mark.asyncio
async def test_rate_limited_returns_marker(db, test_bot, test_channel, stub_helpers):
    stub_helpers["check_admin"].side_effect = RateLimitTimeout(wait_seconds=15)

    result = await ApplyModerationAction(db).execute(
        bot_id=test_bot.id, chat_id=test_channel.telegram_id, message_id=1,
        user_id=10, username="u", message_text="x",
        action=ActionType.BAN, mute_duration=None,
        reason="r", reason_source="s", reason_context=None,
    )
    assert result.startswith("rate_limited:")


@pytest.mark.asyncio
async def test_bad_request_returns_marker(db, test_bot, test_channel, stub_helpers):
    stub_helpers["ban"].side_effect = TelegramBadRequest(method=None, message="bad")

    result = await ApplyModerationAction(db).execute(
        bot_id=test_bot.id, chat_id=test_channel.telegram_id, message_id=1,
        user_id=10, username="u", message_text="x",
        action=ActionType.BAN, mute_duration=None,
        reason="r", reason_source="s", reason_context=None,
    )
    assert result == "bad_request"


@pytest.mark.asyncio
async def test_api_error_returns_marker(db, test_bot, test_channel, stub_helpers):
    stub_helpers["ban"].side_effect = TelegramAPIError(method=None, message="boom")

    result = await ApplyModerationAction(db).execute(
        bot_id=test_bot.id, chat_id=test_channel.telegram_id, message_id=1,
        user_id=10, username="u", message_text="x",
        action=ActionType.BAN, mute_duration=None,
        reason="r", reason_source="s", reason_context=None,
    )
    assert result == "api_error"
