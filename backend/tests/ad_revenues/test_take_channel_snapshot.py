"""Тесты для TakeChannelSnapshot — сетевой вызов в Telegram замокан."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select

from backend.models.channels import ChannelSubscribersSnapshot
from backend.services.ad_revenues.features.take_channel_snapshot import TakeChannelSnapshot


def make_fake_bot(count_or_exc):
    """Возвращает объект, имитирующий RateLimitedBot.bot.get_chat_member_count."""

    async def fake_count(chat_id):
        if isinstance(count_or_exc, Exception):
            raise count_or_exc
        return count_or_exc

    inner = SimpleNamespace(get_chat_member_count=fake_count)
    return SimpleNamespace(bot=inner)


@pytest.mark.asyncio
async def test_writes_snapshot_when_bot_returns_count(db, test_user, test_channel, monkeypatch):
    monkeypatch.setattr(
        "backend.services.ad_revenues.features.take_channel_snapshot.resolve_for_channel",
        AsyncMock(return_value=make_fake_bot(1234)),
    )

    result = await TakeChannelSnapshot(db).execute(test_channel.id)
    await db.commit()

    assert result is not None
    assert result.channel_id == test_channel.id
    assert result.subscribers_count == 1234

    rows = (await db.execute(
        select(ChannelSubscribersSnapshot).where(
            ChannelSubscribersSnapshot.channel_id == test_channel.id
        )
    )).scalars().all()
    assert len(rows) == 1
    assert rows[0].subscribers_count == 1234


@pytest.mark.asyncio
async def test_returns_none_when_channel_missing(db, monkeypatch):
    monkeypatch.setattr(
        "backend.services.ad_revenues.features.take_channel_snapshot.resolve_for_channel",
        AsyncMock(return_value=make_fake_bot(1)),
    )

    result = await TakeChannelSnapshot(db).execute(999_999)
    assert result is None


@pytest.mark.asyncio
async def test_returns_none_when_bot_resolve_fails(db, test_channel, monkeypatch):
    monkeypatch.setattr(
        "backend.services.ad_revenues.features.take_channel_snapshot.resolve_for_channel",
        AsyncMock(side_effect=Exception("no bot")),
    )

    result = await TakeChannelSnapshot(db).execute(test_channel.id)
    assert result is None


@pytest.mark.asyncio
async def test_returns_none_when_telegram_api_raises(db, test_channel, monkeypatch):
    monkeypatch.setattr(
        "backend.services.ad_revenues.features.take_channel_snapshot.resolve_for_channel",
        AsyncMock(return_value=make_fake_bot(TelegramAPIError(method=None, message="boom"))),
    )

    result = await TakeChannelSnapshot(db).execute(test_channel.id)
    await db.commit()
    assert result is None

    rows = (await db.execute(
        select(ChannelSubscribersSnapshot).where(
            ChannelSubscribersSnapshot.channel_id == test_channel.id
        )
    )).scalars().all()
    assert rows == []
