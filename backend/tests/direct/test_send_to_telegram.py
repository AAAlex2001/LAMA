"""Тесты `send_to_telegram` — маршрутизация 0/1/N медиа в правильный bot.send_*."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.models.bots import MessageType
from backend.schemas.bots.messages import SendMessageRequest
from backend.services.direct.features.messages.send_to_telegram import (
    send_to_telegram,
    wrap_for_send,
)


def make_request(text=None, media_type=None):
    return SendMessageRequest(text_content=text, media_type=media_type)


@pytest.mark.asyncio
async def test_zero_media_with_text_sends_text():
    client = SimpleNamespace(send_message=AsyncMock(return_value=SimpleNamespace(message_id=1)))
    result = await send_to_telegram(
        client, tg_chat_id=-100, request=make_request(text="hi"),
        media_urls=[], reply_markup=None, reply_params={},
    )
    assert len(result) == 1
    client.send_message.assert_awaited_once()
    args = client.send_message.call_args
    assert args.kwargs["text"] == "hi"


@pytest.mark.asyncio
async def test_zero_media_no_text_returns_empty():
    client = SimpleNamespace(send_message=AsyncMock())
    result = await send_to_telegram(
        client, tg_chat_id=-100, request=make_request(),
        media_urls=[], reply_markup=None, reply_params={},
    )
    assert result == []
    client.send_message.assert_not_called()


@pytest.mark.asyncio
async def test_single_photo_sends_photo():
    client = SimpleNamespace(send_photo=AsyncMock(return_value=SimpleNamespace(message_id=10)))
    result = await send_to_telegram(
        client, tg_chat_id=-100,
        request=make_request(text="caption", media_type=MessageType.PHOTO),
        media_urls=["https://cdn/p.jpg"],
        reply_markup=None, reply_params={},
    )
    assert len(result) == 1
    client.send_photo.assert_awaited_once()


@pytest.mark.asyncio
async def test_single_video_sends_video():
    client = SimpleNamespace(send_video=AsyncMock(return_value=SimpleNamespace(message_id=11)))
    result = await send_to_telegram(
        client, tg_chat_id=-100,
        request=make_request(text="v", media_type=MessageType.VIDEO),
        media_urls=["https://cdn/v.mp4"],
        reply_markup=None, reply_params={},
    )
    assert len(result) == 1
    client.send_video.assert_awaited_once()


@pytest.mark.asyncio
async def test_single_document_sends_document():
    client = SimpleNamespace(send_document=AsyncMock(return_value=SimpleNamespace(message_id=12)))
    result = await send_to_telegram(
        client, tg_chat_id=-100,
        request=make_request(media_type=MessageType.DOCUMENT),
        media_urls=["https://cdn/d.pdf"],
        reply_markup=None, reply_params={},
    )
    assert len(result) == 1
    client.send_document.assert_awaited_once()


@pytest.mark.asyncio
async def test_single_audio_sends_audio():
    client = SimpleNamespace(send_audio=AsyncMock(return_value=SimpleNamespace(message_id=13)))
    result = await send_to_telegram(
        client, tg_chat_id=-100,
        request=make_request(media_type=MessageType.AUDIO),
        media_urls=["https://cdn/a.mp3"],
        reply_markup=None, reply_params={},
    )
    assert len(result) == 1
    client.send_audio.assert_awaited_once()


@pytest.mark.asyncio
async def test_single_media_detects_type_when_not_specified():
    """media_type не задан → определяется по расширению URL."""
    client = SimpleNamespace(send_video=AsyncMock(return_value=SimpleNamespace(message_id=20)))
    await send_to_telegram(
        client, tg_chat_id=-100,
        request=make_request(text="cap"),  # media_type=None
        media_urls=["https://cdn/clip.mp4"],
        reply_markup=None, reply_params={},
    )
    client.send_video.assert_awaited_once()


@pytest.mark.asyncio
async def test_album_uses_send_media_group():
    client = SimpleNamespace(send_media_group=AsyncMock(return_value=[
        SimpleNamespace(message_id=30),
        SimpleNamespace(message_id=31),
    ]))
    result = await send_to_telegram(
        client, tg_chat_id=-100,
        request=make_request(text="album cap"),
        media_urls=["https://cdn/1.jpg", "https://cdn/2.jpg"],
        reply_markup=None, reply_params={},
    )
    assert len(result) == 2
    client.send_media_group.assert_awaited_once()


@pytest.mark.asyncio
async def test_album_caps_at_10_items():
    """Telegram media_group лимит — 10; берём первые 10."""
    client = SimpleNamespace(send_media_group=AsyncMock(return_value=[
        SimpleNamespace(message_id=i) for i in range(10)
    ]))
    urls = [f"https://cdn/{i}.jpg" for i in range(15)]
    await send_to_telegram(
        client, tg_chat_id=-100,
        request=make_request(text="a"),
        media_urls=urls, reply_markup=None, reply_params={},
    )
    call = client.send_media_group.call_args
    assert len(call.kwargs["media"]) == 10


@pytest.mark.asyncio
async def test_reply_params_passed_through():
    client = SimpleNamespace(send_message=AsyncMock(return_value=SimpleNamespace(message_id=1)))
    await send_to_telegram(
        client, tg_chat_id=-100, request=make_request(text="hi"),
        media_urls=[], reply_markup=None,
        reply_params={"reply_to_message_id": 99},
    )
    assert client.send_message.call_args.kwargs["reply_to_message_id"] == 99


def test_wrap_for_send_photo_returns_url_string():
    """Для фото / стикеров возвращаем строку URL."""
    assert wrap_for_send("https://cdn/p.jpg", MessageType.PHOTO) == "https://cdn/p.jpg"
    assert wrap_for_send("https://cdn/s.webp", MessageType.STICKER) == "https://cdn/s.webp"


def test_wrap_for_send_video_returns_url_input_file():
    """Для видео/документа — URLInputFile с filename."""
    wrapped = wrap_for_send("https://cdn/clip.mp4?token=x", MessageType.VIDEO)
    assert hasattr(wrapped, "filename")
    assert wrapped.filename == "clip.mp4"
