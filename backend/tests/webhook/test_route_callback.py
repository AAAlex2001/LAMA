"""Тесты диспатча callback-запросов по префиксу callback_data."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.services.webhook.features.callbacks.route_callback import RouteCallback


@pytest.fixture
def stub_all_handlers(monkeypatch):
    """Заменяет все 7 веток на простые AsyncMock с захватом вызовов."""
    handlers = {
        "private_captcha": AsyncMock(),
        "group_captcha": AsyncMock(),
        "admin_action": AsyncMock(),
        "publication_hidden_text": AsyncMock(),
        "publication_callback": AsyncMock(),
        "command_hidden_text": AsyncMock(),
        "command_callback": AsyncMock(),
    }

    classes = {
        "CheckPrivateCaptcha": "private_captcha",
        "CheckGroupCaptcha": "group_captcha",
        "ExecuteAdminAction": "admin_action",
        "ShowPublicationHiddenText": "publication_hidden_text",
        "ExecutePublicationCallbackAction": "publication_callback",
        "ShowCommandHiddenText": "command_hidden_text",
        "ExecuteCommandCallbackAction": "command_callback",
    }
    for cls_name, handler_key in classes.items():
        target = handlers[handler_key]
        monkeypatch.setattr(
            f"backend.services.webhook.features.callbacks.route_callback.{cls_name}",
            lambda db, bot_model, _target=target: SimpleNamespace(execute=_target),
        )
    return handlers


def make_callback(data: str):
    return SimpleNamespace(data=data, message=None, from_user=None)


@pytest.mark.asyncio
async def test_group_captcha_prefix(db, test_bot, stub_all_handlers):
    router = RouteCallback(db, test_bot)
    await router.execute(make_callback("group_captcha_yes_42"))
    stub_all_handlers["group_captcha"].assert_awaited_once()


@pytest.mark.asyncio
async def test_private_captcha_prefix(db, test_bot, stub_all_handlers):
    router = RouteCallback(db, test_bot)
    await router.execute(make_callback("captcha_correct_99"))
    stub_all_handlers["private_captcha"].assert_awaited_once()
    stub_all_handlers["group_captcha"].assert_not_called()


@pytest.mark.asyncio
async def test_admin_action_prefix(db, test_bot, stub_all_handlers):
    router = RouteCallback(db, test_bot)
    await router.execute(make_callback("admincall_kick_42"))
    stub_all_handlers["admin_action"].assert_awaited_once()


@pytest.mark.asyncio
async def test_publication_hidden_text_prefix(db, test_bot, stub_all_handlers):
    router = RouteCallback(db, test_bot)
    await router.execute(make_callback("hidden_text:123:btn1"))
    stub_all_handlers["publication_hidden_text"].assert_awaited_once()


@pytest.mark.asyncio
async def test_publication_callback_prefix(db, test_bot, stub_all_handlers):
    router = RouteCallback(db, test_bot)
    await router.execute(make_callback("callback:123:btn1"))
    stub_all_handlers["publication_callback"].assert_awaited_once()


@pytest.mark.asyncio
async def test_unknown_prefix_is_noop(db, test_bot, stub_all_handlers):
    router = RouteCallback(db, test_bot)
    await router.execute(make_callback("totally_random_data"))
    for handler in stub_all_handlers.values():
        handler.assert_not_called()


@pytest.mark.asyncio
async def test_empty_data_is_noop(db, test_bot, stub_all_handlers):
    router = RouteCallback(db, test_bot)
    await router.execute(make_callback(None))
    for handler in stub_all_handlers.values():
        handler.assert_not_called()


@pytest.mark.asyncio
async def test_dispatch_picks_first_matching_prefix(db, test_bot, stub_all_handlers):
    """`captcha_` после `group_captcha_` — нужно матчить group_captcha сначала."""
    router = RouteCallback(db, test_bot)
    await router.execute(make_callback("group_captcha_x"))
    stub_all_handlers["group_captcha"].assert_awaited_once()
    stub_all_handlers["private_captcha"].assert_not_called()
