"""Тесты резолва бота под апдейтом: по чату и/или по токену."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.services.webhook.features.bot_context.get_bot_by_chat import GetBotByChat
from backend.services.webhook.features.bot_context.get_bot_by_token import GetBotByToken
from backend.services.webhook.features.bot_context.resolve_bot_context import (
    ResolveBotContext,
)


def make_update(chat_id=None, has_message=True):
    """Минимальный фейк aiogram.Update."""
    message = None
    if has_message and chat_id is not None:
        message = SimpleNamespace(
            chat=SimpleNamespace(id=chat_id),
            from_user=None,
            new_chat_members=None,
            left_chat_member=None,
            text=None,
            caption=None,
        )
    return SimpleNamespace(
        message=message,
        edited_message=None,
        channel_post=None,
        edited_channel_post=None,
        callback_query=None,
        my_chat_member=None,
        chat_member=None,
        chat_join_request=None,
    )


@pytest.mark.asyncio
async def test_get_bot_by_token(db, test_bot):
    found = await GetBotByToken().execute(db, test_bot.token)
    assert found is not None
    assert found.id == test_bot.id


@pytest.mark.asyncio
async def test_get_bot_by_token_returns_none_for_unknown(db):
    found = await GetBotByToken().execute(db, "nonexistent:token")
    assert found is None


@pytest.mark.asyncio
async def test_get_bot_by_chat_via_channel_link(db, test_bot, test_channel):
    found = await GetBotByChat().execute(db, test_channel.telegram_id)
    assert found is not None
    assert found.id == test_bot.id


@pytest.mark.asyncio
async def test_get_bot_by_chat_returns_none_for_unknown(db):
    found = await GetBotByChat().execute(db, -9999999999)
    assert found is None


@pytest.mark.asyncio
async def test_resolve_prefers_chat_match(db, test_bot, test_channel):
    """Когда есть chat в апдейте — резолв по чату приоритетнее токена."""
    update = make_update(chat_id=test_channel.telegram_id)
    resolved = await ResolveBotContext().execute(db, update, bot_token=test_bot.token)
    assert resolved is not None
    assert resolved.id == test_bot.id


@pytest.mark.asyncio
async def test_resolve_falls_back_to_token(db, test_bot):
    """Чат не привязан к боту — резолв по токену из URL."""
    update = make_update(chat_id=-99999999)  # неизвестный чат
    resolved = await ResolveBotContext().execute(db, update, bot_token=test_bot.token)
    assert resolved is not None
    assert resolved.id == test_bot.id


@pytest.mark.asyncio
async def test_resolve_rejects_chat_match_with_wrong_token(db, test_bot, test_channel):
    """Если найденный по чату бот не совпадает с токеном из URL — возвращаем None."""
    update = make_update(chat_id=test_channel.telegram_id)
    resolved = await ResolveBotContext().execute(
        db, update, bot_token="completely:different",
    )
    assert resolved is None


@pytest.mark.asyncio
async def test_resolve_returns_none_when_no_chat_no_token(db):
    """Update без чата и без токена — None."""
    update = make_update(chat_id=None, has_message=False)
    resolved = await ResolveBotContext().execute(db, update, bot_token=None)
    assert resolved is None
