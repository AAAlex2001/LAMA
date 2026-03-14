"""Per-bot рейт-лимитер для Telegram Bot API.

Лимиты Telegram (per bot):
- 1 сообщение в секунду на один чат
- 20 сообщений в минуту на одну группу/супергруппу
- 30 сообщений в секунду глобально на бота

Каждый бот получает собственный лимитер, изолированный от остальных.
Лимит одного чата НЕ блокирует отправку в другие чаты.
"""

from __future__ import annotations

import asyncio
import os
import time
from contextlib import asynccontextmanager
from typing import Dict, Optional, Protocol


class RateLimiter(Protocol):
    """Интерфейс рейт-лимитера."""

    @asynccontextmanager
    async def limit(self, chat_id: Optional[int] = None, weight: int = 1):
        yield


class InMemoryTelegramRateLimiter:
    """In-memory лимитер (fallback без Redis). Per-chat delay внутри одного бота."""

    def __init__(self, per_chat_delay: float = 1.0):
        self.per_chat_delay = per_chat_delay
        self.locks: dict[int, asyncio.Lock] = {}
        self.last: dict[int, float] = {}
        self.guard = asyncio.Lock()

    async def lock_for(self, chat_id: int) -> asyncio.Lock:
        if chat_id in self.locks:
            return self.locks[chat_id]
        async with self.guard:
            if chat_id not in self.locks:
                self.locks[chat_id] = asyncio.Lock()
        return self.locks[chat_id]

    @asynccontextmanager
    async def limit(self, chat_id: Optional[int] = None, weight: int = 1):
        if chat_id is None:
            yield
            return

        delay = self.per_chat_delay * max(weight, 1)
        lock = await self.lock_for(chat_id)
        async with lock:
            last = self.last.get(chat_id)
            if last is not None:
                wait = delay - (time.monotonic() - last)
                if wait > 0:
                    await asyncio.sleep(wait)
            try:
                yield
            finally:
                self.last[chat_id] = time.monotonic()


class RedisTelegramRateLimiter:
    """Redis-лимитер с per-bot namespace.

    Лимиты:
    - per_chat_delay_seconds=1.0  — 1 msg/sec на чат
    - per_group_per_minute=20     — 20 msg/min на группу
    - global_per_second=30        — 30 msg/sec на бота
    """

    def __init__(
        self,
        redis_url: str,
        bot_key: str = "default",
        per_chat_delay_seconds: float = 1.0,
        global_per_second: int = 30,
        per_group_per_minute: int = 20,
    ):
        self.redis_url = redis_url
        self.bot_key = bot_key
        self.per_chat_delay_seconds = per_chat_delay_seconds
        self.global_per_second = global_per_second
        self.per_group_per_minute = per_group_per_minute
        self.client = None

    def get_client(self):
        if self.client is not None:
            return self.client
        from redis.asyncio import Redis
        self.client = Redis.from_url(self.redis_url)
        return self.client

    async def wait_global(self, weight: int) -> None:
        """Per-bot глобальный лимит: 30 msg/sec на бота."""
        client = self.get_client()
        while True:
            now_sec = int(time.time())
            key = f"lama:rl:{self.bot_key}:global:{now_sec}"
            count = await client.incrby(key, weight)
            await client.expire(key, 2)
            if count <= self.global_per_second:
                return
            ttl_ms = await client.pttl(key)
            sleep_s = max(float(ttl_ms) / 1000.0, 0.05) if ttl_ms > 0 else 0.2
            await asyncio.sleep(sleep_s)

    async def wait_group(self, chat_id: int, weight: int) -> None:
        """Per-bot лимит для группы: 20 msg/min на группу."""
        if chat_id >= 0:
            return
        client = self.get_client()
        while True:
            now_min = int(time.time() // 60)
            key = f"lama:rl:{self.bot_key}:group:{chat_id}:{now_min}"
            count = await client.incrby(key, weight)
            await client.expire(key, 70)
            if count <= self.per_group_per_minute:
                return
            ttl_ms = await client.pttl(key)
            sleep_s = max(float(ttl_ms) / 1000.0, 0.2) if ttl_ms > 0 else 1.0
            await asyncio.sleep(sleep_s)

    async def wait_chat_delay(self, chat_id: int, weight: int) -> None:
        """Per-bot задержка: 1 msg/sec на конкретный чат."""
        client = self.get_client()
        delay_ms = int(self.per_chat_delay_seconds * 1000 * max(weight, 1))
        key = f"lama:rl:{self.bot_key}:chat:{chat_id}"
        while True:
            ok = await client.set(key, "1", nx=True, px=delay_ms)
            if ok:
                return
            ttl_ms = await client.pttl(key)
            sleep_s = max(float(ttl_ms) / 1000.0, 0.05) if ttl_ms > 0 else 0.2
            await asyncio.sleep(sleep_s)

    @asynccontextmanager
    async def limit(self, chat_id: Optional[int] = None, weight: int = 1):
        if chat_id is None:
            yield
            return

        w = max(weight, 1)
        await self.wait_global(w)
        await self.wait_group(chat_id, w)
        await self.wait_chat_delay(chat_id, w)
        yield


# ── Per-bot limiter registry ──

bot_limiters: Dict[str, RateLimiter] = {}


def get_rate_limiter(bot_key: str = "default") -> RateLimiter:
    """Получить рейт-лимитер для конкретного бота (по bot_id из токена)."""
    if bot_key in bot_limiters:
        return bot_limiters[bot_key]

    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        lim = RedisTelegramRateLimiter(redis_url=redis_url, bot_key=bot_key)
    else:
        lim = InMemoryTelegramRateLimiter(per_chat_delay=1.0)

    bot_limiters[bot_key] = lim
    return lim
