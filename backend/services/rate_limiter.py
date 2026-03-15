"""Per-bot рейт-лимитер для Telegram Bot API.

Лимиты Telegram (per bot):
- 1 сообщение в секунду на один чат (per-chat delay)
- 20 сообщений в минуту на одну группу/супергруппу (per-group)
- 30 сообщений в секунду глобально на бота (global)

Каждый бот получает собственный лимитер, изолированный от остальных.
Лимит одного чата НЕ блокирует отправку в другие чаты.
Redis обязателен — без него система не запускается.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Optional

from redis.asyncio import Redis
from aiogram.exceptions import TelegramRetryAfter

logger = logging.getLogger(__name__)


class RateLimitTimeout(Exception):
    """Наш rate limiter говорит «подожди» — НЕ ошибка Telegram.

    Используется когда wait превышает допустимый порог и мы не хотим
    блокировать воркер. Задача завершается быстро, воркер свободен.
    """

    def __init__(self, chat_id: int, wait_seconds: float):
        self.chat_id = chat_id
        self.wait_seconds = wait_seconds
        super().__init__(f"Rate limit timeout: chat {chat_id} needs {wait_seconds:.1f}s wait")


class RedisTelegramRateLimiter:
    """Redis-лимитер с per-bot namespace.

    Три уровня контроля:
    1. Global: 30 msg/sec на бота
    2. Group: 20 msg/min на группу (chat_id < 0)
    3. Chat: 1 msg/sec на конкретный чат

    + notify_retry_after: когда Telegram возвращает 429, блокируем
      конкретный чат в Redis на retry_after секунд.
      Все воркеры (процессы) видят этот блок через Redis.
    """

    def __init__(
        self,
        client: Redis,
        bot_key: str,
        per_chat_delay_seconds: float = 1.0,
        global_per_second: int = 30,
        per_group_per_minute: int = 20,
    ):
        self.client = client
        self.bot_key = bot_key
        self.per_chat_delay_seconds = per_chat_delay_seconds
        self.global_per_second = global_per_second
        self.per_group_per_minute = per_group_per_minute

    async def notify_retry_after(self, chat_id: int, retry_after: int) -> None:
        """Telegram вернул 429 — блокируем ТОЛЬКО этот чат на retry_after секунд."""
        key = f"lama:rl:{self.bot_key}:chat:{chat_id}"
        px = retry_after * 1000
        await self.client.set(key, "1", px=px)
        logger.info(
            "Rate limiter: chat %s blocked for %ss (RetryAfter), bot=%s",
            chat_id, retry_after, self.bot_key,
        )

    async def wait_global(self, weight: int) -> None:
        """Per-bot глобальный лимит: 30 msg/sec на бота."""
        for _ in range(30):
            now_sec = int(time.time())
            key = f"lama:rl:{self.bot_key}:global:{now_sec}"
            count = await self.client.incrby(key, weight)
            await self.client.expire(key, 2)
            if count <= self.global_per_second:
                return
            # откатываем счётчик — слот не наш
            await self.client.decrby(key, weight)
            ttl_ms = await self.client.pttl(key)
            sleep_s = max(float(ttl_ms) / 1000.0, 0.05) if ttl_ms > 0 else 0.2
            await asyncio.sleep(sleep_s)

    async def wait_group(self, chat_id: int, weight: int) -> None:
        """Per-bot лимит для группы: 20 msg/min на группу.

        Ждём до 5 секунд. Если нужно ждать дольше — RateLimitTimeout,
        чтобы не блокировать воркер.
        """
        if chat_id >= 0 or weight <= 0:
            return
        for attempt in range(3):
            now = time.time()
            now_min = int(now // 60)
            key = f"lama:rl:{self.bot_key}:group:{chat_id}:{now_min}"
            count = await self.client.incrby(key, weight)
            await self.client.expire(key, 70)
            if count <= self.per_group_per_minute:
                return
            await self.client.decrby(key, weight)
            wait = 60 - (now % 60)
            if wait > 5:
                raise RateLimitTimeout(chat_id, wait)
            await asyncio.sleep(wait + 0.1)
        raise RateLimitTimeout(chat_id, 60)

    async def wait_chat_delay(self, chat_id: int, weight: int) -> None:
        """Per-bot задержка: 1 msg/sec на конкретный чат."""
        delay_ms = int(self.per_chat_delay_seconds * 1000 * max(weight, 1))
        key = f"lama:rl:{self.bot_key}:chat:{chat_id}"
        for _ in range(30):
            ok = await self.client.set(key, "1", nx=True, px=delay_ms)
            if ok:
                return
            ttl_ms = await self.client.pttl(key)
            if ttl_ms > 5000:
                raise RateLimitTimeout(chat_id, ttl_ms / 1000)
            sleep_s = max(float(ttl_ms) / 1000.0, 0.05) if ttl_ms > 0 else 0.2
            await asyncio.sleep(sleep_s)

    @asynccontextmanager
    async def limit(self, chat_id: Optional[int] = None, weight: int = 1, group_weight: Optional[int] = None):
        if chat_id is None:
            yield
            return

        w = max(weight, 1)
        gw = w if group_weight is None else group_weight
        await self.wait_chat_delay(chat_id, w)
        await self.wait_group(chat_id, gw)
        await self.wait_global(w)
        try:
            yield
        except TelegramRetryAfter as e:
            await self.notify_retry_after(chat_id, e.retry_after)
            raise



rl_state = {"client": None, "limiters": {}}

def get_redis_client() -> Redis:
    if rl_state["client"] is None:
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            raise RuntimeError("REDIS_URL is not set.")
        from redis.asyncio import Redis as AioRedis
        rl_state["client"] = AioRedis.from_url(redis_url)
    return rl_state["client"]

def get_rate_limiter(bot_key: str = "default") -> RedisTelegramRateLimiter:
    if bot_key not in rl_state["limiters"]:
        client = get_redis_client()
        lim = RedisTelegramRateLimiter(client=client, bot_key=bot_key)
        rl_state["limiters"][bot_key] = lim
    return rl_state["limiters"][bot_key]
