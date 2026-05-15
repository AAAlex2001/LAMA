"""Тесты set/delete/get webhook с моком aiogram.Bot и DNS-retry."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest
from fastapi import HTTPException

from backend.services.webhook.features.settings.delete_webhook import DeleteWebhook
from backend.services.webhook.features.settings.get_webhook_info import GetWebhookInfo
from backend.services.webhook.features.settings.set_webhook import SetWebhook


def make_bot(set_side_effect=None, info_url=None):
    """Возвращает фейкового бота с set_webhook / get_webhook_info / delete_webhook."""
    if isinstance(set_side_effect, Exception):
        set_mock = AsyncMock(side_effect=set_side_effect)
    elif callable(set_side_effect):
        set_mock = AsyncMock(side_effect=set_side_effect)
    else:
        set_mock = AsyncMock(return_value=True)

    info = SimpleNamespace(url=info_url) if info_url is not None else None
    return SimpleNamespace(
        set_webhook=set_mock,
        get_webhook_info=AsyncMock(return_value=info),
        delete_webhook=AsyncMock(return_value=True),
    )


@pytest.mark.asyncio
async def test_set_webhook_skips_when_url_unchanged(monkeypatch):
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.WEBHOOK_DOMAIN",
        "https://example.com",
    )
    expected_url = "https://example.com/api/telegram/webhook/999:tok"
    bot = make_bot(info_url=expected_url)
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.resolve_by_token",
        lambda _: SimpleNamespace(bot=bot),
    )

    url = await SetWebhook().execute("999:tok")
    assert url == expected_url
    bot.set_webhook.assert_not_called()


@pytest.mark.asyncio
async def test_set_webhook_sets_when_url_different(monkeypatch):
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.WEBHOOK_DOMAIN",
        "https://example.com",
    )
    bot = make_bot(info_url="https://old.example/webhook")
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.resolve_by_token",
        lambda _: SimpleNamespace(bot=bot),
    )

    url = await SetWebhook().execute("999:tok")
    assert url == "https://example.com/api/telegram/webhook/999:tok"
    bot.set_webhook.assert_awaited_once()


@pytest.mark.asyncio
async def test_set_webhook_raises_400_for_telegram_rejection(monkeypatch):
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.WEBHOOK_DOMAIN",
        "https://example.com",
    )
    bot = make_bot(
        set_side_effect=TelegramBadRequest(method=None, message="bad request"),
        info_url="https://old/webhook",
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.resolve_by_token",
        lambda _: SimpleNamespace(bot=bot),
    )

    with pytest.raises(HTTPException) as exc:
        await SetWebhook().execute("999:tok")
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_set_webhook_retries_on_dns_error(monkeypatch):
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.WEBHOOK_DOMAIN",
        "https://example.com",
    )

    call_count = {"n": 0}

    async def flaky_set_webhook(**kwargs):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise TelegramBadRequest(method=None, message="failed to resolve host")
        return True

    bot = SimpleNamespace(
        set_webhook=flaky_set_webhook,
        get_webhook_info=AsyncMock(return_value=SimpleNamespace(url="https://old/webhook")),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.resolve_by_token",
        lambda _: SimpleNamespace(bot=bot),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.asyncio.sleep",
        AsyncMock(),
    )

    url = await SetWebhook().execute("999:tok")
    assert url.endswith("999:tok")
    assert call_count["n"] == 2


@pytest.mark.asyncio
async def test_set_webhook_502_after_all_dns_retries_fail(monkeypatch):
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.WEBHOOK_DOMAIN",
        "https://example.com",
    )
    bot = SimpleNamespace(
        set_webhook=AsyncMock(side_effect=TelegramBadRequest(
            method=None, message="failed to resolve host",
        )),
        get_webhook_info=AsyncMock(return_value=SimpleNamespace(url="old")),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.resolve_by_token",
        lambda _: SimpleNamespace(bot=bot),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.asyncio.sleep",
        AsyncMock(),
    )

    with pytest.raises(HTTPException) as exc:
        await SetWebhook().execute("999:tok")
    assert exc.value.status_code == 502


def test_set_webhook_dns_error_detection():
    assert SetWebhook.is_dns_error(Exception("failed to resolve host")) is True
    assert SetWebhook.is_dns_error(Exception("temporary failure in name resolution")) is True
    assert SetWebhook.is_dns_error(Exception("400 chat not found")) is False


def test_set_webhook_url_construction(monkeypatch):
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.set_webhook.WEBHOOK_DOMAIN",
        "https://lamaplanner.com/",
    )
    url = SetWebhook.get_url("abc:def")
    assert url == "https://lamaplanner.com/api/telegram/webhook/abc:def"


@pytest.mark.asyncio
async def test_delete_webhook_calls_aiogram(monkeypatch):
    bot = make_bot()
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.delete_webhook.resolve_by_token",
        lambda _: SimpleNamespace(bot=bot),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.delete_webhook.evict_bot",
        AsyncMock(),
    )

    await DeleteWebhook().execute("999:tok")
    bot.delete_webhook.assert_awaited_once_with(drop_pending_updates=True)


@pytest.mark.asyncio
async def test_delete_webhook_swallows_telegram_error(monkeypatch):
    bot = SimpleNamespace(
        delete_webhook=AsyncMock(side_effect=TelegramAPIError(method=None, message="boom"))
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.delete_webhook.resolve_by_token",
        lambda _: SimpleNamespace(bot=bot),
    )
    evict = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.delete_webhook.evict_bot",
        evict,
    )

    await DeleteWebhook().execute("999:tok")
    evict.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_webhook_skip_evict(monkeypatch):
    bot = make_bot()
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.delete_webhook.resolve_by_token",
        lambda _: SimpleNamespace(bot=bot),
    )
    evict = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.settings.delete_webhook.evict_bot",
        evict,
    )

    await DeleteWebhook().execute("999:tok", evict_cache=False)
    evict.assert_not_called()


@pytest.mark.asyncio
async def test_get_webhook_info_returns_data():
    info = SimpleNamespace(url="https://test/webhook")
    bot = SimpleNamespace(get_webhook_info=AsyncMock(return_value=info))
    result = await GetWebhookInfo().execute(bot)
    assert result is info


@pytest.mark.asyncio
async def test_get_webhook_info_returns_none_on_error():
    bot = SimpleNamespace(get_webhook_info=AsyncMock(
        side_effect=TelegramAPIError(method=None, message="boom")
    ))
    result = await GetWebhookInfo().execute(bot)
    assert result is None
