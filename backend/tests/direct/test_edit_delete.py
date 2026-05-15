"""Тесты `EditMessage` + `DeleteMessage` — TG-вызовы + БД-апдейт + WS-broadcast."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.models.bots import BotMessage, MessageType
from backend.schemas.direct.message import EditMessageRequest
from backend.services.direct.features.messages.delete_message import DeleteMessage
from backend.services.direct.features.messages.edit_message import EditMessage


async def add_outgoing(db, bot, *, message_type=MessageType.TEXT, text="hi", chat_id=42):
    msg = BotMessage(
        bot_id=bot.id,
        telegram_message_id=100,
        chat_id=chat_id,
        user_id=None,
        message_type=message_type,
        text_content=text,
        is_incoming=False,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


@pytest.mark.asyncio
async def test_edit_text_message_calls_edit_message_text(
    db, test_user, test_bot, monkeypatch,
):
    msg = await add_outgoing(db, test_bot, message_type=MessageType.TEXT)

    edit_mock = AsyncMock()
    fake_client = SimpleNamespace(edit_message_text=edit_mock, edit_message_caption=AsyncMock())
    monkeypatch.setattr(
        "backend.services.direct.features.messages.edit_message.resolve_by_token",
        lambda _: fake_client,
    )

    request = EditMessageRequest(text_content="новый текст")
    result = await EditMessage(db).execute(
        msg.id, test_user.id, request, bot_id=test_bot.id,
    )
    await db.commit()
    await db.refresh(msg)

    assert result.text_content == "новый текст"
    edit_mock.assert_awaited_once()
    fake_client.edit_message_caption.assert_not_called()


@pytest.mark.asyncio
async def test_edit_photo_message_calls_edit_message_caption(
    db, test_user, test_bot, monkeypatch,
):
    msg = await add_outgoing(db, test_bot, message_type=MessageType.PHOTO)

    caption_mock = AsyncMock()
    fake_client = SimpleNamespace(
        edit_message_text=AsyncMock(),
        edit_message_caption=caption_mock,
    )
    monkeypatch.setattr(
        "backend.services.direct.features.messages.edit_message.resolve_by_token",
        lambda _: fake_client,
    )

    request = EditMessageRequest(text_content="новая подпись")
    await EditMessage(db).execute(msg.id, test_user.id, request, bot_id=test_bot.id)

    caption_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_edit_with_empty_text_skips_tg(db, test_user, test_bot, monkeypatch):
    msg = await add_outgoing(db, test_bot)

    fake_client = SimpleNamespace(edit_message_text=AsyncMock())
    monkeypatch.setattr(
        "backend.services.direct.features.messages.edit_message.resolve_by_token",
        lambda _: fake_client,
    )

    request = EditMessageRequest(text_content=None)
    result = await EditMessage(db).execute(msg.id, test_user.id, request)

    assert result.id == msg.id
    fake_client.edit_message_text.assert_not_called()


@pytest.mark.asyncio
async def test_edit_404_for_other_users_message(db, test_bot):
    msg = await add_outgoing(db, test_bot)
    with pytest.raises(HTTPException) as exc:
        await EditMessage(db).execute(msg.id, owner_id=9999, request=EditMessageRequest(text_content="x"))
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_edit_404_for_incoming_message(db, test_user, test_bot):
    """Входящие сообщения нельзя редактировать — only is_incoming=False."""
    incoming = BotMessage(
        bot_id=test_bot.id,
        telegram_message_id=200,
        chat_id=42,
        message_type=MessageType.TEXT,
        text_content="from user",
        is_incoming=True,
    )
    db.add(incoming)
    await db.commit()
    await db.refresh(incoming)

    with pytest.raises(HTTPException) as exc:
        await EditMessage(db).execute(
            incoming.id, test_user.id, EditMessageRequest(text_content="x"),
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_edit_wraps_tg_error_as_400(db, test_user, test_bot, monkeypatch):
    msg = await add_outgoing(db, test_bot)

    fake_client = SimpleNamespace(
        edit_message_text=AsyncMock(side_effect=RuntimeError("network down")),
    )
    monkeypatch.setattr(
        "backend.services.direct.features.messages.edit_message.resolve_by_token",
        lambda _: fake_client,
    )

    with pytest.raises(HTTPException) as exc:
        await EditMessage(db).execute(
            msg.id, test_user.id, EditMessageRequest(text_content="new"),
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_delete_removes_from_db_after_tg_succeeds(
    db, test_user, test_bot, monkeypatch,
):
    msg = await add_outgoing(db, test_bot)
    msg_id = msg.id

    delete_mock = AsyncMock()
    monkeypatch.setattr(
        "backend.services.direct.features.messages.delete_message.resolve_by_token",
        lambda _: SimpleNamespace(delete_message=delete_mock),
    )

    result = await DeleteMessage(db).execute(msg_id, test_user.id)
    await db.commit()

    assert result is True
    delete_mock.assert_awaited_once()
    found = await db.get(BotMessage, msg_id)
    assert found is None


@pytest.mark.asyncio
async def test_delete_keeps_db_when_tg_fails(db, test_user, test_bot, monkeypatch):
    msg = await add_outgoing(db, test_bot)
    msg_id = msg.id

    monkeypatch.setattr(
        "backend.services.direct.features.messages.delete_message.resolve_by_token",
        lambda _: SimpleNamespace(
            delete_message=AsyncMock(side_effect=RuntimeError("boom")),
        ),
    )

    with pytest.raises(HTTPException) as exc:
        await DeleteMessage(db).execute(msg_id, test_user.id)
    assert exc.value.status_code == 400

    await db.rollback()
    found = await db.get(BotMessage, msg_id)
    assert found is not None


@pytest.mark.asyncio
async def test_delete_404_for_other_users_message(db, test_bot):
    msg = await add_outgoing(db, test_bot)
    with pytest.raises(HTTPException) as exc:
        await DeleteMessage(db).execute(msg.id, owner_id=9999)
    assert exc.value.status_code == 404
