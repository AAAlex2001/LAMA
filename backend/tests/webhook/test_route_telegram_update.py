"""Тесты главного маршрутизатора update'а — все ветки с мокированными обработчиками."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.models.bots import Bot, BotStatus
from backend.services.webhook.features.dispatch.route_telegram_update import (
    RouteTelegramUpdate,
)


@pytest.fixture
def stub_branches(monkeypatch):
    """Заменяет все 7 веток обработчика на AsyncMock'и."""
    handlers = {}

    def stub_class(name, async_executes=True):
        instance_execute = AsyncMock() if async_executes else AsyncMock()
        handlers[name] = instance_execute
        monkeypatch.setattr(
            f"backend.services.webhook.features.dispatch.route_telegram_update.{name}",
            lambda *args, **kwargs: SimpleNamespace(execute=instance_execute),
        )
        return instance_execute

    # Side-effect мутируется в тестах перед вызовом
    handlers["RouteJoinRequest"] = stub_class("RouteJoinRequest")
    handlers["RouteCallback"] = stub_class("RouteCallback")
    handlers["ClearBanLockOnUnban"] = stub_class("ClearBanLockOnUnban")
    handlers["UpdateSubscription"] = stub_class("UpdateSubscription")
    handlers["SyncBotMembership"] = stub_class("SyncBotMembership")
    handlers["CheckMessage"] = stub_class("CheckMessage")

    # RouteMessage — у него два метода
    save_mock = AsyncMock(return_value=None)
    after_save_mock = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.dispatch.route_telegram_update.RouteMessage",
        lambda *args, **kwargs: SimpleNamespace(
            save=save_mock, after_save=after_save_mock,
        ),
    )
    handlers["RouteMessage.save"] = save_mock
    handlers["RouteMessage.after_save"] = after_save_mock

    # SendStartMessage / SendGuestLink
    handlers["SendStartMessage"] = stub_class("SendStartMessage")
    handlers["SendGuestLink"] = stub_class("SendGuestLink")

    return handlers


@pytest.fixture
def stub_session(monkeypatch, db):
    """Делает session_scope yielding нашей тестовой db-фикстурой."""
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def fake_scope():
        yield db

    monkeypatch.setattr(
        "backend.services.webhook.features.dispatch.route_telegram_update.session_scope",
        fake_scope,
    )


@pytest.fixture
def stub_resolve_bot(monkeypatch, test_bot):
    """ResolveBotContext возвращает test_bot."""
    monkeypatch.setattr(
        "backend.services.webhook.features.dispatch.route_telegram_update.ResolveBotContext",
        lambda: SimpleNamespace(execute=AsyncMock(return_value=test_bot)),
    )


@pytest.fixture
def stub_resolve_bot_none(monkeypatch):
    monkeypatch.setattr(
        "backend.services.webhook.features.dispatch.route_telegram_update.ResolveBotContext",
        lambda: SimpleNamespace(execute=AsyncMock(return_value=None)),
    )


def make_message(text="hello", chat_id=-100, chat_type="supergroup"):
    return SimpleNamespace(
        text=text,
        chat=SimpleNamespace(id=chat_id, type=chat_type),
        message_id=42,
    )


def make_update(**kwargs):
    defaults = dict(
        message=None, edited_message=None, channel_post=None,
        callback_query=None, my_chat_member=None, chat_member=None,
        chat_join_request=None,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


@pytest.mark.asyncio
async def test_returns_when_no_bot_resolved(stub_session, stub_resolve_bot_none, stub_branches):
    update = make_update(message=make_message())
    await RouteTelegramUpdate().execute(update, bot_token="999:tok")
    stub_branches["RouteMessage.save"].assert_not_called()


@pytest.mark.asyncio
async def test_inactive_bot_short_circuits(monkeypatch, stub_session, test_bot, stub_branches):
    test_bot.status = BotStatus.INACTIVE
    monkeypatch.setattr(
        "backend.services.webhook.features.dispatch.route_telegram_update.ResolveBotContext",
        lambda: SimpleNamespace(execute=AsyncMock(return_value=test_bot)),
    )
    update = make_update(message=make_message())
    await RouteTelegramUpdate().execute(update, bot_token="999:tok")
    stub_branches["RouteMessage.save"].assert_not_called()


@pytest.mark.asyncio
async def test_start_command_short_circuits(stub_session, stub_resolve_bot, stub_branches):
    update = make_update(message=make_message(text="/start", chat_id=100, chat_type="private"))
    await RouteTelegramUpdate().execute(update, bot_token="999:tok")
    stub_branches["SendStartMessage"].assert_awaited_once()
    stub_branches["RouteMessage.save"].assert_not_called()


@pytest.mark.asyncio
async def test_guest_command_short_circuits(stub_session, stub_resolve_bot, stub_branches):
    update = make_update(message=make_message(text="/guest", chat_id=100, chat_type="private"))
    await RouteTelegramUpdate().execute(update, bot_token="999:tok")
    stub_branches["SendGuestLink"].assert_awaited_once()


@pytest.mark.asyncio
async def test_blocked_by_moderation_short_circuits(stub_session, stub_resolve_bot, stub_branches):
    stub_branches["CheckMessage"].return_value = True  # заблокировано
    update = make_update(message=make_message(text="bad", chat_type="supergroup"))
    await RouteTelegramUpdate().execute(update, bot_token="999:tok")
    stub_branches["RouteMessage.save"].assert_not_called()


@pytest.mark.asyncio
async def test_join_request_routes_to_handler(stub_session, stub_resolve_bot, stub_branches):
    join_request = SimpleNamespace(chat=SimpleNamespace(id=-100), from_user=None)
    update = make_update(chat_join_request=join_request)
    await RouteTelegramUpdate().execute(update, bot_token="999:tok")
    stub_branches["RouteJoinRequest"].assert_awaited_once()


@pytest.mark.asyncio
async def test_message_routes_to_route_message(stub_session, stub_resolve_bot, stub_branches):
    stub_branches["CheckMessage"].return_value = False  # не заблокировано
    update = make_update(message=make_message(text="привет"))
    await RouteTelegramUpdate().execute(update, bot_token="999:tok")
    stub_branches["RouteMessage.save"].assert_awaited_once()
    stub_branches["RouteMessage.after_save"].assert_awaited_once()


@pytest.mark.asyncio
async def test_callback_routes_to_route_callback(stub_session, stub_resolve_bot, stub_branches):
    callback = SimpleNamespace(data="hidden_text:1:btn", from_user=None, message=None)
    update = make_update(callback_query=callback)
    await RouteTelegramUpdate().execute(update, bot_token="999:tok")
    stub_branches["RouteCallback"].assert_awaited_once()


@pytest.mark.asyncio
async def test_chat_member_clears_lock_and_updates_subscription(
    stub_session, stub_resolve_bot, stub_branches,
):
    chat_member = SimpleNamespace(
        new_chat_member=SimpleNamespace(status="member"),
        old_chat_member=SimpleNamespace(status="kicked"),
    )
    update = make_update(chat_member=chat_member)
    await RouteTelegramUpdate().execute(update, bot_token="999:tok")
    stub_branches["ClearBanLockOnUnban"].assert_awaited_once()
    stub_branches["UpdateSubscription"].assert_awaited_once()


@pytest.mark.asyncio
async def test_my_chat_member_syncs_membership(stub_session, stub_resolve_bot, stub_branches):
    my_chat_member = SimpleNamespace(
        new_chat_member=SimpleNamespace(status="administrator"),
        old_chat_member=SimpleNamespace(status="left"),
    )
    update = make_update(my_chat_member=my_chat_member)
    await RouteTelegramUpdate().execute(update, bot_token="999:tok")
    stub_branches["SyncBotMembership"].assert_awaited_once()


@pytest.mark.asyncio
async def test_swallows_exception_from_handler(
    stub_session, stub_resolve_bot, stub_branches, caplog,
):
    """Если handler упал — exception ловится и логируется, не пробрасывается."""
    stub_branches["RouteMessage.save"].side_effect = RuntimeError("boom")
    update = make_update(message=make_message(text="x"))
    stub_branches["CheckMessage"].return_value = False

    await RouteTelegramUpdate().execute(update, bot_token="999:tok")
    assert any("Bot logic error" in r.message for r in caplog.records)
