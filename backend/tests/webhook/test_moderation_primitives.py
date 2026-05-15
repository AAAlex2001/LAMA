"""Тесты примитивов модерации: ban/mute/kick/unmute + админ-чек + delete + clear-lock."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatPermissions

from backend.services.webhook.features.moderation.ban_user import BanUser
from backend.services.webhook.features.moderation.check_moderation_admin import (
    CheckModerationAdmin,
)
from backend.services.webhook.features.moderation.clear_ban_lock_on_unban import (
    ClearBanLockOnUnban,
)
from backend.services.webhook.features.moderation.delete_moderated_message import (
    DeleteModeratedMessage,
)
from backend.services.webhook.features.moderation.kick_user import KickUser
from backend.services.webhook.features.moderation.mute_user import MuteUser
from backend.services.webhook.features.moderation.unmute_user import UnmuteUser


@pytest.mark.asyncio
async def test_ban_user_calls_ban_chat_member():
    bot = SimpleNamespace(ban_chat_member=AsyncMock())
    await BanUser().execute(bot, chat_id=-100, user_id=42)
    bot.ban_chat_member.assert_awaited_once_with(chat_id=-100, user_id=42)


@pytest.mark.asyncio
async def test_kick_user_revoke_messages_false():
    bot = SimpleNamespace(ban_chat_member=AsyncMock())
    await KickUser().execute(bot, chat_id=-100, user_id=42)
    bot.ban_chat_member.assert_awaited_once_with(
        chat_id=-100, user_id=42, revoke_messages=False,
    )


@pytest.mark.asyncio
async def test_mute_user_without_duration():
    bot = SimpleNamespace(restrict_chat_member=AsyncMock())
    await MuteUser().execute(bot, chat_id=-100, user_id=42, mute_duration=None)
    bot.restrict_chat_member.assert_awaited_once()
    kwargs = bot.restrict_chat_member.call_args.kwargs
    assert kwargs["chat_id"] == -100
    assert kwargs["user_id"] == 42
    assert kwargs["until_date"] is None
    assert isinstance(kwargs["permissions"], ChatPermissions)
    assert kwargs["permissions"].can_send_messages is False


@pytest.mark.asyncio
async def test_mute_user_with_duration_sets_until_date():
    bot = SimpleNamespace(restrict_chat_member=AsyncMock())
    await MuteUser().execute(bot, chat_id=-100, user_id=42, mute_duration=30)
    kwargs = bot.restrict_chat_member.call_args.kwargs
    assert kwargs["until_date"] is not None
    # Лежит в будущем на ~30 минут
    from datetime import datetime, timezone
    delta = (kwargs["until_date"] - datetime.now(timezone.utc)).total_seconds()
    assert 25 * 60 < delta < 31 * 60


@pytest.mark.asyncio
async def test_unmute_restores_all_permissions():
    bot = SimpleNamespace(restrict_chat_member=AsyncMock())
    await UnmuteUser().execute(bot, chat_id=-100, user_id=42)
    kwargs = bot.restrict_chat_member.call_args.kwargs
    assert kwargs["permissions"].can_send_messages is True
    assert kwargs["permissions"].can_send_photos is True


@pytest.mark.asyncio
async def test_check_admin_true_for_administrator():
    member = SimpleNamespace(status="administrator")
    bot = SimpleNamespace(get_chat_member=AsyncMock(return_value=member))
    assert await CheckModerationAdmin().execute(bot, -100, 42) is True


@pytest.mark.asyncio
async def test_check_admin_true_for_creator():
    member = SimpleNamespace(status="creator")
    bot = SimpleNamespace(get_chat_member=AsyncMock(return_value=member))
    assert await CheckModerationAdmin().execute(bot, -100, 42) is True


@pytest.mark.asyncio
async def test_check_admin_false_for_member():
    member = SimpleNamespace(status="member")
    bot = SimpleNamespace(get_chat_member=AsyncMock(return_value=member))
    assert await CheckModerationAdmin().execute(bot, -100, 42) is False


@pytest.mark.asyncio
async def test_check_admin_treats_owner_error_as_admin():
    """Telegram отказывается удалить владельца — это тоже сигнал что юзер админ."""
    bot = SimpleNamespace(get_chat_member=AsyncMock(
        side_effect=TelegramAPIError(method=None, message="can't remove chat owner"),
    ))
    assert await CheckModerationAdmin().execute(bot, -100, 42) is True


@pytest.mark.asyncio
async def test_check_admin_returns_false_on_other_api_errors():
    bot = SimpleNamespace(get_chat_member=AsyncMock(
        side_effect=TelegramAPIError(method=None, message="bad request"),
    ))
    assert await CheckModerationAdmin().execute(bot, -100, 42) is False


@pytest.mark.asyncio
async def test_delete_message_calls_delete():
    bot = SimpleNamespace(delete_message=AsyncMock())
    await DeleteModeratedMessage().execute(bot, chat_id=-100, message_id=99)
    bot.delete_message.assert_awaited_once_with(chat_id=-100, message_id=99)


@pytest.mark.asyncio
async def test_delete_message_swallows_telegram_error():
    bot = SimpleNamespace(delete_message=AsyncMock(
        side_effect=TelegramAPIError(method=None, message="message to delete not found"),
    ))
    await DeleteModeratedMessage().execute(bot, chat_id=-100, message_id=99)


def make_chat_member_update(old_status, new_status, chat_id=-100, user_id=42):
    user = SimpleNamespace(id=user_id)
    return SimpleNamespace(
        chat=SimpleNamespace(id=chat_id),
        old_chat_member=SimpleNamespace(status=old_status, user=user),
        new_chat_member=SimpleNamespace(status=new_status, user=user),
    )


@pytest.mark.asyncio
async def test_clear_lock_on_unban_calls_clear(monkeypatch):
    clear = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.clear_ban_lock_on_unban.clear_banned",
        clear,
    )

    update = make_chat_member_update("kicked", "member")
    await ClearBanLockOnUnban().execute(update)
    clear.assert_awaited_once_with(-100, 42)


@pytest.mark.asyncio
async def test_clear_lock_does_nothing_on_kick(monkeypatch):
    clear = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.clear_ban_lock_on_unban.clear_banned",
        clear,
    )

    update = make_chat_member_update("member", "kicked")
    await ClearBanLockOnUnban().execute(update)
    clear.assert_not_called()


@pytest.mark.asyncio
async def test_clear_lock_does_nothing_between_restricted_states(monkeypatch):
    clear = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.moderation.clear_ban_lock_on_unban.clear_banned",
        clear,
    )

    update = make_chat_member_update("kicked", "restricted")
    await ClearBanLockOnUnban().execute(update)
    clear.assert_not_called()
