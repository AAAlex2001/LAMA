"""Тесты lookup-функций direct: владелец-чек + 404."""

import pytest
from fastapi import HTTPException

from backend.services.direct.features.chats.lookup import (
    bot_belongs_to_owner,
    find_chat_by_id_or_404,
    get_chat_and_bot,
)


@pytest.mark.asyncio
async def test_get_chat_and_bot_returns(db, test_user, test_bot, test_chat):
    chat, bot = await get_chat_and_bot(
        db, test_bot.id, test_chat.tg_chat_id, test_user.id,
    )
    assert chat.id == test_chat.id
    assert bot.id == test_bot.id


@pytest.mark.asyncio
async def test_get_chat_and_bot_404_for_wrong_owner(db, test_bot, test_chat):
    with pytest.raises(HTTPException) as exc:
        await get_chat_and_bot(db, test_bot.id, test_chat.tg_chat_id, owner_id=9999)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_chat_and_bot_404_for_unknown_chat(db, test_user, test_bot):
    with pytest.raises(HTTPException) as exc:
        await get_chat_and_bot(db, test_bot.id, tg_chat_id=99999999, owner_id=test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_find_chat_by_id(db, test_user, test_chat):
    found = await find_chat_by_id_or_404(db, test_chat.id, test_user.id)
    assert found.id == test_chat.id


@pytest.mark.asyncio
async def test_find_chat_by_id_404_for_wrong_owner(db, test_chat):
    with pytest.raises(HTTPException) as exc:
        await find_chat_by_id_or_404(db, test_chat.id, owner_id=9999)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_bot_belongs_to_owner_true(db, test_user, test_bot):
    assert await bot_belongs_to_owner(db, test_bot.id, test_user.id) is True


@pytest.mark.asyncio
async def test_bot_belongs_to_owner_false(db, test_bot):
    assert await bot_belongs_to_owner(db, test_bot.id, owner_id=9999) is False
