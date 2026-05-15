"""Тесты простых helper-ов модуля captcha и callbacks."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatPermissions

from backend.models.bots import PendingApproval
from backend.services.webhook.features.callbacks.answer_callback import AnswerCallback
from backend.services.webhook.features.callbacks.check_subscriber import CheckSubscriber
from backend.services.webhook.features.callbacks.get_callback_button_target import (
    GetCallbackButtonTarget,
)
from backend.services.webhook.features.captcha.approve_pending_join_request import (
    ApprovePendingJoinRequest,
)
from backend.services.webhook.features.captcha.delete_captcha import DeleteCaptcha
from backend.services.webhook.features.captcha.get_captcha import GetCaptcha
from backend.services.webhook.features.captcha.unlock_captcha_user import UnlockCaptchaUser


def test_get_captcha_parses_private_callback():
    """private формат: `captcha_<pending>_<answer>` — 3 части."""
    data = GetCaptcha().from_callback("captcha_42_7", group=False)
    assert data is not None
    assert data.pending_id == 42
    assert data.user_answer == "7"


def test_get_captcha_parses_group_callback():
    """group формат: `group_captcha_<pending>_<answer>` — 4 части."""
    data = GetCaptcha().from_callback("group_captcha_99_42", group=True)
    assert data is not None
    assert data.pending_id == 99
    assert data.user_answer == "42"


def test_get_captcha_returns_none_for_short_payload():
    assert GetCaptcha().from_callback("captcha", group=False) is None
    assert GetCaptcha().from_callback("group_captcha_99", group=True) is None


def test_get_captcha_returns_none_for_invalid_pending_id():
    assert GetCaptcha().from_callback("captcha_notnumeric_7", group=False) is None


def test_get_captcha_returns_none_for_empty():
    assert GetCaptcha().from_callback(None, group=False) is None
    assert GetCaptcha().from_callback("", group=True) is None


@pytest.mark.asyncio
async def test_get_captcha_chat_id_from_db(db):
    pending = PendingApproval(
        bot_id=1, user_id=10, chat_id=-100,
        captcha_question="q", captcha_answer="a",
    )
    db.add(pending)
    await db.commit()
    await db.refresh(pending)

    chat_id = await GetCaptcha(db).get_chat_id(pending.id)
    assert chat_id == -100


@pytest.mark.asyncio
async def test_get_captcha_chat_id_returns_zero_when_unknown(db):
    chat_id = await GetCaptcha(db).get_chat_id(99999)
    assert chat_id == 0


@pytest.mark.asyncio
async def test_delete_captcha_calls_aiogram():
    bot = SimpleNamespace(delete_message=AsyncMock())
    message = SimpleNamespace(chat=SimpleNamespace(id=-100), message_id=42)
    await DeleteCaptcha().execute(bot, message)
    bot.delete_message.assert_awaited_once_with(chat_id=-100, message_id=42)


@pytest.mark.asyncio
async def test_delete_captcha_swallows_error():
    bot = SimpleNamespace(delete_message=AsyncMock(
        side_effect=TelegramAPIError(method=None, message="not found"),
    ))
    message = SimpleNamespace(chat=SimpleNamespace(id=-100), message_id=42)
    await DeleteCaptcha().execute(bot, message)


@pytest.mark.asyncio
async def test_delete_captcha_skips_no_message():
    bot = SimpleNamespace(delete_message=AsyncMock())
    await DeleteCaptcha().execute(bot, None)
    bot.delete_message.assert_not_called()


@pytest.mark.asyncio
async def test_unlock_captcha_restores_permissions():
    bot = SimpleNamespace(restrict_chat_member=AsyncMock())
    await UnlockCaptchaUser().execute(bot, chat_id=-100, user_id=42)
    kwargs = bot.restrict_chat_member.call_args.kwargs
    assert isinstance(kwargs["permissions"], ChatPermissions)
    assert kwargs["permissions"].can_send_messages is True
    assert kwargs["permissions"].can_invite_users is True
    assert kwargs["use_independent_chat_permissions"] is True


@pytest.mark.asyncio
async def test_unlock_captcha_swallows_error():
    bot = SimpleNamespace(restrict_chat_member=AsyncMock(
        side_effect=TelegramAPIError(method=None, message="user not found"),
    ))
    await UnlockCaptchaUser().execute(bot, chat_id=-100, user_id=42)


@pytest.mark.asyncio
async def test_approve_pending_returns_pending_on_success(db):
    pending = PendingApproval(
        bot_id=1, user_id=10, chat_id=-100,
        captcha_question="q", captcha_answer="a",
    )
    db.add(pending)
    await db.commit()
    await db.refresh(pending)

    bot = SimpleNamespace(approve_chat_join_request=AsyncMock(return_value=True))
    result = await ApprovePendingJoinRequest(db).execute(bot, pending.id)
    assert result is not None
    assert result.id == pending.id
    bot.approve_chat_join_request.assert_awaited_once_with(chat_id=-100, user_id=10)


@pytest.mark.asyncio
async def test_approve_pending_returns_none_when_not_found(db):
    bot = SimpleNamespace(approve_chat_join_request=AsyncMock())
    result = await ApprovePendingJoinRequest(db).execute(bot, 99999)
    assert result is None
    bot.approve_chat_join_request.assert_not_called()


@pytest.mark.asyncio
async def test_approve_pending_returns_none_on_telegram_error(db):
    pending = PendingApproval(
        bot_id=1, user_id=10, chat_id=-100,
        captcha_question="q", captcha_answer="a",
    )
    db.add(pending)
    await db.commit()
    await db.refresh(pending)

    bot = SimpleNamespace(approve_chat_join_request=AsyncMock(
        side_effect=TelegramAPIError(method=None, message="join request already accepted"),
    ))
    result = await ApprovePendingJoinRequest(db).execute(bot, pending.id)
    assert result is None


@pytest.mark.asyncio
async def test_answer_callback_calls_aiogram():
    bot = SimpleNamespace(answer_callback_query=AsyncMock())
    await AnswerCallback().execute(bot, "cbid", "Hello", show_alert=True)
    bot.answer_callback_query.assert_awaited_once_with(
        "cbid", text="Hello", show_alert=True,
    )


@pytest.mark.asyncio
async def test_answer_callback_swallows_old_query_error():
    bot = SimpleNamespace(answer_callback_query=AsyncMock(
        side_effect=TelegramAPIError(method=None, message="query is too old"),
    ))
    await AnswerCallback().execute(bot, "cbid", "x")


@pytest.mark.asyncio
async def test_check_subscriber_true_for_member():
    member = SimpleNamespace(status="member")
    bot = SimpleNamespace(get_chat_member=AsyncMock(return_value=member))
    assert await CheckSubscriber().execute(bot, -100, 42) is True


@pytest.mark.asyncio
async def test_check_subscriber_false_for_kicked():
    member = SimpleNamespace(status="kicked")
    bot = SimpleNamespace(get_chat_member=AsyncMock(return_value=member))
    assert await CheckSubscriber().execute(bot, -100, 42) is False


@pytest.mark.asyncio
async def test_check_subscriber_false_on_api_error():
    bot = SimpleNamespace(get_chat_member=AsyncMock(
        side_effect=TelegramAPIError(method=None, message="user not found"),
    ))
    assert await CheckSubscriber().execute(bot, -100, 42) is False


def test_get_callback_button_target_parses_three_parts():
    target = GetCallbackButtonTarget().execute("hidden_text:42:btn1")
    assert target is not None
    assert target.entity_id == 42
    assert target.button_id == "btn1"


def test_get_callback_button_target_joins_extra_parts():
    """ID кнопки может содержать `:` — join всех частей после entity_id."""
    target = GetCallbackButtonTarget().execute("callback:42:btn:with:colons")
    assert target.button_id == "btn:with:colons"


def test_get_callback_button_target_returns_none_for_short():
    assert GetCallbackButtonTarget().execute("callback:42") is None
    assert GetCallbackButtonTarget().execute("") is None
    assert GetCallbackButtonTarget().execute(None) is None


def test_get_callback_button_target_returns_none_for_invalid_id():
    assert GetCallbackButtonTarget().execute("callback:notnumeric:btn1") is None
