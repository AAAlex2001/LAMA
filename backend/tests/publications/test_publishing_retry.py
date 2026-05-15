"""Тесты `send_to_channel_with_retry` — retry-логика с моком aiogram."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from aiogram.exceptions import (
    TelegramBadRequest,
    TelegramForbiddenError,
    TelegramRetryAfter,
)

from backend.models.channels import ChannelGroup, ChannelType
from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.services.publications.features.publishing.send_to_channel_with_retry import (
    send_to_channel_with_retry,
    MAX_RETRY_ATTEMPTS,
)


def make_publication(pin_message=False):
    return Publication(
        id=1,
        owner_id=1,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.DRAFT,
        text_content="hello",
        pin_message=pin_message,
    )


def make_channel():
    return ChannelGroup(
        id=10, owner_id=1, telegram_id=-100,
        channel_type=ChannelType.CHANNEL, title="ch",
    )


def make_bot():
    return SimpleNamespace(pin_chat_message=AsyncMock())


def make_message(message_id=42):
    return SimpleNamespace(message_id=message_id)


@pytest.mark.asyncio
async def test_success_first_attempt(monkeypatch):
    send_mock = AsyncMock(return_value=[make_message(101), make_message(102)])
    monkeypatch.setattr(
        "backend.services.publications.features.publishing.send_to_channel_with_retry.send_to_telegram",
        send_mock,
    )

    result = await send_to_channel_with_retry(
        make_publication(), make_channel(), make_bot(), "ch",
    )

    assert result.success is True
    assert result.message_ids == [101, 102]
    assert len(result.telegram_messages_data) == 2
    assert send_mock.call_count == 1


@pytest.mark.asyncio
async def test_pins_first_message_when_requested(monkeypatch):
    monkeypatch.setattr(
        "backend.services.publications.features.publishing.send_to_channel_with_retry.send_to_telegram",
        AsyncMock(return_value=[make_message(55)]),
    )
    bot = make_bot()

    await send_to_channel_with_retry(
        make_publication(pin_message=True), make_channel(), bot, "ch",
    )

    bot.pin_chat_message.assert_awaited_once()
    call = bot.pin_chat_message.call_args.kwargs
    assert call["message_id"] == 55
    assert call["disable_notification"] is True


@pytest.mark.asyncio
async def test_fatal_telegram_error_no_retry(monkeypatch):
    send_mock = AsyncMock(side_effect=TelegramForbiddenError(method=None, message="bot kicked"))
    monkeypatch.setattr(
        "backend.services.publications.features.publishing.send_to_channel_with_retry.send_to_telegram",
        send_mock,
    )

    result = await send_to_channel_with_retry(
        make_publication(), make_channel(), make_bot(), "ch",
    )

    assert result.success is False
    assert send_mock.call_count == 1
    assert "kicked" in result.error
    assert result.notification_error is not None


@pytest.mark.asyncio
async def test_bad_request_no_retry(monkeypatch):
    send_mock = AsyncMock(side_effect=TelegramBadRequest(method=None, message="message too long"))
    monkeypatch.setattr(
        "backend.services.publications.features.publishing.send_to_channel_with_retry.send_to_telegram",
        send_mock,
    )

    result = await send_to_channel_with_retry(
        make_publication(), make_channel(), make_bot(), "ch",
    )

    assert result.success is False
    assert send_mock.call_count == 1


@pytest.mark.asyncio
async def test_retry_after_short_then_success(monkeypatch):
    send_mock = AsyncMock(side_effect=[
        TelegramRetryAfter(method=None, message="rate limit", retry_after=1),
        [make_message(200)],
    ])
    monkeypatch.setattr(
        "backend.services.publications.features.publishing.send_to_channel_with_retry.send_to_telegram",
        send_mock,
    )
    monkeypatch.setattr(
        "backend.services.publications.features.publishing.send_to_channel_with_retry.asyncio.sleep",
        AsyncMock(),
    )

    result = await send_to_channel_with_retry(
        make_publication(), make_channel(), make_bot(), "ch",
    )

    assert result.success is True
    assert send_mock.call_count == 2


@pytest.mark.asyncio
async def test_retry_after_too_large_aborts(monkeypatch):
    send_mock = AsyncMock(side_effect=TelegramRetryAfter(
        method=None, message="rate limit", retry_after=120,
    ))
    monkeypatch.setattr(
        "backend.services.publications.features.publishing.send_to_channel_with_retry.send_to_telegram",
        send_mock,
    )

    result = await send_to_channel_with_retry(
        make_publication(), make_channel(), make_bot(), "ch",
    )

    assert result.success is False
    assert "Rate limit" in result.error
    assert send_mock.call_count == 1


@pytest.mark.asyncio
async def test_generic_error_retries_up_to_max(monkeypatch):
    send_mock = AsyncMock(side_effect=RuntimeError("oops"))
    monkeypatch.setattr(
        "backend.services.publications.features.publishing.send_to_channel_with_retry.send_to_telegram",
        send_mock,
    )
    monkeypatch.setattr(
        "backend.services.publications.features.publishing.send_to_channel_with_retry.asyncio.sleep",
        AsyncMock(),
    )

    result = await send_to_channel_with_retry(
        make_publication(), make_channel(), make_bot(), "ch",
    )

    assert result.success is False
    assert send_mock.call_count == MAX_RETRY_ATTEMPTS


@pytest.mark.asyncio
async def test_pin_failure_does_not_fail_publish(monkeypatch):
    monkeypatch.setattr(
        "backend.services.publications.features.publishing.send_to_channel_with_retry.send_to_telegram",
        AsyncMock(return_value=[make_message(1)]),
    )
    bot = SimpleNamespace(pin_chat_message=AsyncMock(side_effect=RuntimeError("can't pin")))

    result = await send_to_channel_with_retry(
        make_publication(pin_message=True), make_channel(), bot, "ch",
    )

    assert result.success is True
