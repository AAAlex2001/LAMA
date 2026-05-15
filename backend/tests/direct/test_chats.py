"""Тесты GetOrCreateChat + ListChats + UpdateChatStatus + Increment/Reset Unread."""

from datetime import datetime, timezone

import pytest

from backend.models.bots import MessageType
from backend.models.direct import DirectChat
from backend.schemas.direct.chat import DirectChatUpdate
from backend.services.direct.features.chats.get_or_create_chat import GetOrCreateChat
from backend.services.direct.features.chats.increment_unread import IncrementUnread
from backend.services.direct.features.chats.list_chats import ListChats
from backend.services.direct.features.chats.reset_unread import ResetUnread
from backend.services.direct.features.chats.update_chat_status import UpdateChatStatus
from backend.services.direct.features.chats.update_last_message import UpdateLastMessage


@pytest.mark.asyncio
async def test_get_or_create_creates_new(db, test_bot):
    chat = await GetOrCreateChat(db).execute(
        bot_id=test_bot.id, tg_chat_id=12345, tg_user_id=12345,
        tg_username="newone", tg_first_name="N",
    )
    await db.commit()
    assert chat.id is not None
    assert chat.tg_username == "newone"


@pytest.mark.asyncio
async def test_get_or_create_is_idempotent(db, test_bot):
    first = await GetOrCreateChat(db).execute(
        bot_id=test_bot.id, tg_chat_id=12345, tg_first_name="A",
    )
    second = await GetOrCreateChat(db).execute(
        bot_id=test_bot.id, tg_chat_id=12345, tg_first_name="A",
    )
    await db.commit()
    assert first.id == second.id


@pytest.mark.asyncio
async def test_get_or_create_updates_profile(db, test_bot):
    await GetOrCreateChat(db).execute(
        bot_id=test_bot.id, tg_chat_id=12345,
        tg_username="old", tg_first_name="A",
    )
    chat = await GetOrCreateChat(db).execute(
        bot_id=test_bot.id, tg_chat_id=12345,
        tg_username="new", tg_first_name="B",
    )
    await db.commit()
    assert chat.tg_username == "new"
    assert chat.tg_first_name == "B"


@pytest.mark.asyncio
async def test_get_or_create_skips_empty_updates(db, test_bot):
    await GetOrCreateChat(db).execute(
        bot_id=test_bot.id, tg_chat_id=12345, tg_username="kept",
    )
    chat = await GetOrCreateChat(db).execute(
        bot_id=test_bot.id, tg_chat_id=12345, tg_username=None,
    )
    await db.commit()
    assert chat.tg_username == "kept"


@pytest.mark.asyncio
async def test_list_chats_returns_user_chats(db, test_user, test_bot, test_chat):
    chats, total = await ListChats(db).execute(owner_id=test_user.id)
    assert total == 1
    assert chats[0]["id"] == test_chat.id
    assert chats[0]["bot_id"] == test_bot.id


@pytest.mark.asyncio
async def test_list_chats_filters_by_bot(db, test_user, test_bot, test_chat):
    other_bot = type("B", (), {})()
    chats, total = await ListChats(db).execute(owner_id=test_user.id, bot_id=test_bot.id)
    assert total == 1

    chats_none, _ = await ListChats(db).execute(owner_id=test_user.id, bot_id=9999)
    assert chats_none == []


@pytest.mark.asyncio
async def test_list_chats_unread_filter(db, test_user, test_bot):
    db.add(DirectChat(bot_id=test_bot.id, tg_chat_id=1, unread_count=0))
    db.add(DirectChat(bot_id=test_bot.id, tg_chat_id=2, unread_count=3))
    await db.commit()

    unread_only, total = await ListChats(db).execute(
        owner_id=test_user.id, unread_filter="unread",
    )
    assert total == 1

    read_only, total = await ListChats(db).execute(
        owner_id=test_user.id, unread_filter="read",
    )
    assert total == 1


@pytest.mark.asyncio
async def test_list_chats_pinned_first(db, test_user, test_bot):
    db.add(DirectChat(bot_id=test_bot.id, tg_chat_id=1, is_pinned=False))
    db.add(DirectChat(bot_id=test_bot.id, tg_chat_id=2, is_pinned=True))
    await db.commit()

    chats, _ = await ListChats(db).execute(owner_id=test_user.id)
    assert chats[0]["is_pinned"] is True


@pytest.mark.asyncio
async def test_list_chats_preview_for_text(db, test_user, test_bot):
    db.add(DirectChat(
        bot_id=test_bot.id, tg_chat_id=1,
        last_message_text="привет",
        last_message_type=MessageType.TEXT,
        last_message_at=datetime.now(timezone.utc),
    ))
    await db.commit()

    chats, _ = await ListChats(db).execute(owner_id=test_user.id)
    assert chats[0]["last_message_preview"] == "привет"


@pytest.mark.asyncio
async def test_list_chats_preview_for_media(db, test_user, test_bot):
    db.add(DirectChat(
        bot_id=test_bot.id, tg_chat_id=1,
        last_message_text=None,
        last_message_type=MessageType.PHOTO,
        last_message_at=datetime.now(timezone.utc),
    ))
    await db.commit()

    chats, _ = await ListChats(db).execute(owner_id=test_user.id)
    assert chats[0]["last_message_preview"]  # любой не-None label


@pytest.mark.asyncio
async def test_update_chat_status_pin(db, test_user, test_chat):
    updated = await UpdateChatStatus(db).execute(
        test_chat.id, test_user.id, DirectChatUpdate(is_pinned=True),
    )
    await db.commit()
    assert updated.is_pinned is True


@pytest.mark.asyncio
async def test_update_chat_status_block(db, test_user, test_chat):
    updated = await UpdateChatStatus(db).execute(
        test_chat.id, test_user.id, DirectChatUpdate(is_blocked=True),
    )
    await db.commit()
    assert updated.is_blocked is True


@pytest.mark.asyncio
async def test_increment_unread(db, test_bot, test_chat):
    await IncrementUnread(db).execute(test_bot.id, test_chat.tg_chat_id)
    await db.commit()
    await db.refresh(test_chat)
    assert test_chat.unread_count == 1

    await IncrementUnread(db).execute(test_bot.id, test_chat.tg_chat_id)
    await db.commit()
    await db.refresh(test_chat)
    assert test_chat.unread_count == 2


@pytest.mark.asyncio
async def test_increment_unread_noop_for_unknown_chat(db, test_bot):
    await IncrementUnread(db).execute(test_bot.id, tg_chat_id=99999)


@pytest.mark.asyncio
async def test_reset_unread(db, test_user, test_bot, test_chat):
    test_chat.unread_count = 7
    await db.commit()

    await ResetUnread(db).execute(test_bot.id, test_chat.tg_chat_id, owner_id=test_user.id)
    await db.commit()
    await db.refresh(test_chat)
    assert test_chat.unread_count == 0


@pytest.mark.asyncio
async def test_update_last_message(db, test_bot, test_chat):
    await UpdateLastMessage(db).execute(
        test_bot.id, test_chat.tg_chat_id,
        text="новое сообщение", message_type=MessageType.TEXT,
    )
    await db.commit()
    await db.refresh(test_chat)
    assert test_chat.last_message_text == "новое сообщение"
    assert test_chat.last_message_at is not None
