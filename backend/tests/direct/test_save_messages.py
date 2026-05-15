"""Тесты `SaveIncomingMessage` + `SaveOutgoingMessage` — запись BotMessage."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.models.bots import BotMessage, MessageType
from backend.services.direct.features.messages.save_incoming_message import SaveIncomingMessage
from backend.services.direct.features.messages.save_outgoing_message import SaveOutgoingMessage


def fake_outgoing_message(
    message_id: int,
    text=None,
    caption=None,
    photo=None,
    video=None,
    document=None,
):
    """Минимальный фейк aiogram.Message для save_outgoing."""
    return SimpleNamespace(
        message_id=message_id,
        text=text,
        caption=caption,
        photo=photo, video=video, document=document, audio=None,
        voice=None, animation=None, sticker=None,
        model_dump=lambda: {"message_id": message_id, "text": text, "caption": caption},
    )


@pytest.mark.asyncio
async def test_save_outgoing_text_message(db, test_bot):
    tg_msg = fake_outgoing_message(100, text="привет")

    saved = await SaveOutgoingMessage(db).execute(
        bot_id=test_bot.id, tg_chat_id=42,
        tg_message=tg_msg, fallback_type=MessageType.TEXT,
        fallback_media_url=None,
    )
    await db.commit()
    await db.refresh(saved)

    assert saved.bot_id == test_bot.id
    assert saved.telegram_message_id == 100
    assert saved.message_type == MessageType.TEXT
    assert saved.text_content == "привет"
    assert saved.is_incoming is False


@pytest.mark.asyncio
async def test_save_outgoing_photo_with_caption(db, test_bot):
    tg_msg = fake_outgoing_message(
        101, caption="фото подпись",
        photo=[SimpleNamespace(file_id="small"), SimpleNamespace(file_id="large")],
    )

    saved = await SaveOutgoingMessage(db).execute(
        bot_id=test_bot.id, tg_chat_id=42,
        tg_message=tg_msg, fallback_type=MessageType.PHOTO,
        fallback_media_url="https://cdn/p.jpg",
    )
    await db.commit()
    await db.refresh(saved)

    assert saved.message_type == MessageType.PHOTO
    assert saved.text_content == "фото подпись"
    assert saved.media_file_id == "large"
    assert saved.media_url == "https://cdn/p.jpg"


@pytest.mark.asyncio
async def test_save_outgoing_uses_fallback_when_message_empty(db, test_bot):
    """Если aiogram-Message без типа медиа — берём fallback_type."""
    tg_msg = fake_outgoing_message(102)

    saved = await SaveOutgoingMessage(db).execute(
        bot_id=test_bot.id, tg_chat_id=42,
        tg_message=tg_msg, fallback_type=MessageType.PHOTO,
        fallback_media_url="https://cdn/p.jpg",
    )
    assert saved.message_type == MessageType.PHOTO


@pytest.mark.asyncio
async def test_save_outgoing_records_reply_to(db, test_bot):
    tg_msg = fake_outgoing_message(103, text="ответ")
    saved = await SaveOutgoingMessage(db).execute(
        bot_id=test_bot.id, tg_chat_id=42,
        tg_message=tg_msg, fallback_type=MessageType.TEXT,
        fallback_media_url=None, reply_to_message_id=99,
    )
    await db.commit()
    assert saved.reply_to_message_id == 99


def fake_incoming_dict(
    message_id=200, text="hi", chat_id=42, user_id=42,
    photo=None, video=None, reply_to=None,
):
    data = {
        "message_id": message_id,
        "text": text,
        "chat": {"id": chat_id, "type": "private"},
        "from": {"id": user_id, "is_bot": False, "first_name": "U"},
    }
    if photo:
        data["photo"] = photo
    if video:
        data["video"] = video
    if reply_to:
        data["reply_to_message"] = reply_to
    return data


@pytest.mark.asyncio
async def test_save_incoming_dict_text(db, test_bot):
    saved = await SaveIncomingMessage(db).execute(test_bot.id, fake_incoming_dict())
    await db.commit()

    assert saved.bot_id == test_bot.id
    assert saved.is_incoming is True
    assert saved.message_type == MessageType.TEXT
    assert saved.text_content == "hi"
    assert saved.chat_id == 42
    assert saved.user_id == 42


@pytest.mark.asyncio
async def test_save_incoming_photo(db, test_bot):
    data = fake_incoming_dict(text=None, photo=[{"file_id": "small"}, {"file_id": "large"}])
    data["caption"] = "тоже хорошо"
    saved = await SaveIncomingMessage(db).execute(test_bot.id, data)
    await db.commit()

    assert saved.message_type == MessageType.PHOTO
    assert saved.media_file_id == "large"
    assert saved.text_content == "тоже хорошо"


@pytest.mark.asyncio
async def test_save_incoming_404_for_unknown_bot(db):
    with pytest.raises(HTTPException) as exc:
        await SaveIncomingMessage(db).execute(bot_id=99999, message=fake_incoming_dict())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_save_incoming_with_reply_to(db, test_bot):
    data = fake_incoming_dict(reply_to={"message_id": 50, "chat": {"id": 42}})
    saved = await SaveIncomingMessage(db).execute(test_bot.id, data)
    await db.commit()
    assert saved.reply_to_message_id == 50
