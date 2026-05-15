"""Тесты intake: валидация секрета, парсинг update, enqueue, главный приёмник."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from backend.schemas.webhook import TelegramWebhookRequest
from backend.services.webhook.features.intake.enqueue_telegram_update import (
    EnqueueTelegramUpdate,
)
from backend.services.webhook.features.intake.get_telegram_update import (
    GetTelegramUpdate,
)
from backend.services.webhook.features.intake.receive_telegram_webhook import (
    ReceiveTelegramWebhook,
)
from backend.services.webhook.features.intake.validate_webhook_secret import (
    ValidateWebhookSecret,
)


def test_validate_secret_ok():
    ValidateWebhookSecret().execute("correct-secret", "correct-secret")


def test_validate_secret_rejects_wrong():
    with pytest.raises(HTTPException) as exc:
        ValidateWebhookSecret().execute("wrong", "correct-secret")
    assert exc.value.status_code == 401


def test_validate_secret_rejects_missing():
    with pytest.raises(HTTPException) as exc:
        ValidateWebhookSecret().execute(None, "correct-secret")
    assert exc.value.status_code == 401


def test_validate_secret_skipped_when_not_configured():
    """Если TELEGRAM_WEBHOOK_SECRET не задан — пропуск (для dev)."""
    ValidateWebhookSecret().execute("any", None)
    ValidateWebhookSecret().execute(None, None)


def test_validate_secret_constant_time_compare():
    """compare_digest защищает от timing-атак."""
    with pytest.raises(HTTPException):
        ValidateWebhookSecret().execute("a" * 100, "b" * 100)


@pytest.mark.asyncio
async def test_get_update_parses_valid_payload():
    request = MagicMock()
    request.json = AsyncMock(return_value={
        "update_id": 12345,
        "message": {
            "message_id": 1,
            "date": 1700000000,
            "chat": {"id": -100, "type": "supergroup", "title": "Test"},
            "from": {"id": 100, "is_bot": False, "first_name": "A"},
            "text": "hello",
        },
    })
    update = await GetTelegramUpdate().execute(request)
    assert update is not None
    assert update.update_id == 12345
    assert update.message.text == "hello"


@pytest.mark.asyncio
async def test_get_update_returns_none_for_empty():
    request = MagicMock()
    request.json = AsyncMock(return_value={})
    update = await GetTelegramUpdate().execute(request)
    assert update is None


@pytest.mark.asyncio
async def test_get_update_returns_none_for_invalid_json():
    request = MagicMock()
    request.json = AsyncMock(side_effect=ValueError("not json"))
    update = await GetTelegramUpdate().execute(request)
    assert update is None


@pytest.mark.asyncio
async def test_get_update_returns_none_for_malformed_update():
    request = MagicMock()
    request.json = AsyncMock(return_value={"garbage": "definitely not an update"})
    update = await GetTelegramUpdate().execute(request)
    assert update is None


def test_enqueue_creates_asyncio_task(monkeypatch):
    """EnqueueTelegramUpdate должен запустить asyncio task с RouteTelegramUpdate."""
    fake_task = MagicMock()
    fake_create_task = MagicMock(return_value=fake_task)
    monkeypatch.setattr(
        "backend.services.webhook.features.intake.enqueue_telegram_update.asyncio.create_task",
        fake_create_task,
    )

    update = SimpleNamespace(update_id=1)
    EnqueueTelegramUpdate().execute(update, "999:token")

    fake_create_task.assert_called_once()
    fake_task.add_done_callback.assert_called_once()


def test_enqueue_log_result_handles_exception(caplog):
    """log_result ловит и логирует exception, не пробрасывая."""
    fake_task = MagicMock()
    fake_task.cancelled = MagicMock(return_value=False)
    fake_task.exception = MagicMock(return_value=RuntimeError("boom"))

    EnqueueTelegramUpdate.log_result(fake_task)
    assert any("Webhook route failed" in r.message for r in caplog.records)


def test_enqueue_log_result_handles_cancellation(caplog):
    fake_task = MagicMock()
    fake_task.cancelled = MagicMock(return_value=True)
    EnqueueTelegramUpdate.log_result(fake_task)
    assert any("cancelled" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_receive_rejects_invalid_secret(monkeypatch):
    monkeypatch.setattr(
        "backend.services.webhook.features.intake.receive_telegram_webhook.TELEGRAM_WEBHOOK_SECRET",
        "expected",
    )
    request = MagicMock()
    payload = TelegramWebhookRequest(bot_token="t", secret_token="wrong")

    with pytest.raises(HTTPException) as exc:
        await ReceiveTelegramWebhook().execute(request=request, webhook_request=payload)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_receive_returns_error_when_no_bot_token(monkeypatch):
    """Пустой bot_token — handler возвращает ok=False (Pydantic не пускает None, но пустая строка проходит)."""
    monkeypatch.setattr(
        "backend.services.webhook.features.intake.receive_telegram_webhook.TELEGRAM_WEBHOOK_SECRET",
        None,
    )
    request = MagicMock()
    payload = TelegramWebhookRequest(bot_token="", secret_token=None)

    response = await ReceiveTelegramWebhook().execute(request=request, webhook_request=payload)
    assert response.ok is False
    assert "bot_token" in response.error.lower()


@pytest.mark.asyncio
async def test_receive_returns_ok_when_update_empty(monkeypatch):
    monkeypatch.setattr(
        "backend.services.webhook.features.intake.receive_telegram_webhook.TELEGRAM_WEBHOOK_SECRET",
        None,
    )
    request = MagicMock()
    request.json = AsyncMock(return_value={})

    response = await ReceiveTelegramWebhook().execute(
        request=request,
        webhook_request=TelegramWebhookRequest(bot_token="t", secret_token=None),
    )
    assert response.ok is True


@pytest.mark.asyncio
async def test_receive_enqueues_valid_update(monkeypatch):
    monkeypatch.setattr(
        "backend.services.webhook.features.intake.receive_telegram_webhook.TELEGRAM_WEBHOOK_SECRET",
        None,
    )
    fake_enqueue = MagicMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.intake.receive_telegram_webhook.EnqueueTelegramUpdate",
        lambda: SimpleNamespace(execute=fake_enqueue),
    )

    request = MagicMock()
    request.json = AsyncMock(return_value={
        "update_id": 99,
        "message": {
            "message_id": 1,
            "date": 1700000000,
            "chat": {"id": 100, "type": "private"},
            "from": {"id": 100, "is_bot": False, "first_name": "X"},
            "text": "hi",
        },
    })

    response = await ReceiveTelegramWebhook().execute(
        request=request,
        webhook_request=TelegramWebhookRequest(bot_token="999:token", secret_token=None),
    )
    assert response.ok is True
    fake_enqueue.assert_called_once()
