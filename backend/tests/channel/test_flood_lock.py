"""Тесты для redis-замка `banned_user_lock` и CheckUserFlood с замоканным redis."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.models.channels import ActionType, ChannelGroup, ChannelType
from backend.services.channel.features.flood.banned_user_lock import (
    clear_banned,
    is_banned,
    lock_key,
    mark_banned,
)
from backend.services.channel.features.flood.check_user_flood import CheckUserFlood


def make_fake_redis(initial_counters=None):
    """Возвращает фейковый redis-клиент с состоянием в памяти."""
    counters = dict(initial_counters or {})
    expirations: dict = {}
    keys_set: set = set()

    async def fake_incr(key):
        counters[key] = counters.get(key, 0) + 1
        return counters[key]

    async def fake_expire(key, ttl):
        expirations[key] = ttl
        return True

    async def fake_delete(key):
        counters.pop(key, None)
        keys_set.discard(key)
        return 1

    async def fake_set(key, value, ex=None):
        keys_set.add(key)
        if ex is not None:
            expirations[key] = ex
        return True

    async def fake_exists(key):
        return 1 if key in keys_set or key in counters else 0

    return SimpleNamespace(
        incr=fake_incr, expire=fake_expire, delete=fake_delete,
        set=fake_set, exists=fake_exists,
        _counters=counters, _expirations=expirations, _keys_set=keys_set,
    )


def make_channel(message_limit=3, interval_seconds=60):
    return ChannelGroup(
        id=42,
        owner_id=1,
        telegram_id=-1,
        channel_type=ChannelType.CHANNEL,
        title="ch",
        flood_message_limit=message_limit,
        flood_interval_seconds=interval_seconds,
        flood_action=ActionType.MUTE,
        flood_mute_duration_minutes=10,
    )


def test_lock_key_format():
    assert lock_key(100, 200) == "banned:100:200"


@pytest.mark.asyncio
async def test_mark_then_is_banned(monkeypatch):
    fake = make_fake_redis()
    monkeypatch.setattr(
        "backend.services.channel.features.flood.banned_user_lock.get_redis_client",
        lambda: fake,
    )

    assert await is_banned(1, 2) is False
    await mark_banned(1, 2, ttl=30)
    assert await is_banned(1, 2) is True


@pytest.mark.asyncio
async def test_clear_banned_removes_lock(monkeypatch):
    fake = make_fake_redis()
    monkeypatch.setattr(
        "backend.services.channel.features.flood.banned_user_lock.get_redis_client",
        lambda: fake,
    )

    await mark_banned(1, 2)
    await clear_banned(1, 2)
    assert await is_banned(1, 2) is False


@pytest.mark.asyncio
async def test_flood_returns_false_when_no_limit(monkeypatch):
    fake = make_fake_redis()
    monkeypatch.setattr(
        "backend.services.channel.features.flood.check_user_flood.get_redis_client",
        lambda: fake,
    )

    channel = make_channel(message_limit=None, interval_seconds=None)
    over, action, mute = await CheckUserFlood().execute(channel, user_id=10)
    assert (over, action, mute) == (False, None, None)


@pytest.mark.asyncio
async def test_flood_returns_false_below_limit(monkeypatch):
    fake = make_fake_redis()
    monkeypatch.setattr(
        "backend.services.channel.features.flood.check_user_flood.get_redis_client",
        lambda: fake,
    )

    channel = make_channel(message_limit=3, interval_seconds=60)
    for _ in range(3):
        over, action, mute = await CheckUserFlood().execute(channel, user_id=10)
        assert over is False


@pytest.mark.asyncio
async def test_flood_returns_true_over_limit(monkeypatch):
    fake = make_fake_redis()
    monkeypatch.setattr(
        "backend.services.channel.features.flood.check_user_flood.get_redis_client",
        lambda: fake,
    )

    channel = make_channel(message_limit=3, interval_seconds=60)
    for _ in range(3):
        await CheckUserFlood().execute(channel, user_id=10)
    over, action, mute = await CheckUserFlood().execute(channel, user_id=10)
    assert over is True
    assert action == ActionType.MUTE
    assert mute == 10


@pytest.mark.asyncio
async def test_flood_sets_ttl_on_first_increment(monkeypatch):
    fake = make_fake_redis()
    monkeypatch.setattr(
        "backend.services.channel.features.flood.check_user_flood.get_redis_client",
        lambda: fake,
    )

    channel = make_channel(message_limit=3, interval_seconds=42)
    await CheckUserFlood().execute(channel, user_id=10)
    assert fake._expirations.get("flood:42:10") == 42
