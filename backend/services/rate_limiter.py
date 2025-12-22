"""
Rate Limiter для Telegram API запросов
Ограничения:
- 30 запросов в секунду глобально для всего бота
- 1 запрос в секунду для конкретного чата
"""
import asyncio
import logging
import time
from collections import deque
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


class TelegramRateLimiter:
    """
    Rate Limiter для Telegram API с двумя уровнями ограничений:
    1. Глобальный лимит: 30 запросов/секунду
    2. Per-chat лимит: 1 запрос/секунду
    """

    def __init__(
        self,
        global_limit: int = 30,
        per_chat_limit: float = 1.0,
    ):
        self.global_limit = global_limit
        self.per_chat_limit = per_chat_limit

        # Глобальная очередь запросов (храним timestamp)
        self.global_requests: deque = deque(maxlen=global_limit)
        self.global_lock = asyncio.Lock()

        # Словарь для хранения последнего запроса к каждому чату
        self.chat_last_request: Dict[int, float] = {}
        self.chat_locks: Dict[int, asyncio.Lock] = {}

    async def acquire(self, chat_id: Optional[int] = None) -> None:
        """
        Получить разрешение на выполнение запроса к Telegram API

        Args:
            chat_id: ID чата (если запрос специфичен для чата)
        """
        # 1. Проверяем глобальный лимит
        await self.wait_global_limit()

        # 2. Если указан chat_id, проверяем лимит на чат
        if chat_id is not None:
            await self.wait_chat_limit(chat_id)

        # 3. Регистрируем запрос
        await self.register_request(chat_id)

    async def wait_global_limit(self) -> None:
        """Ожидание если достигнут глобальный лимит"""
        async with self.global_lock:
            now = time.time()

            # Удаляем старые запросы (старше 1 секунды)
            while self.global_requests and (now - self.global_requests[0]) >= 1.0:
                self.global_requests.popleft()

            # Если достигли лимита, ждём
            if len(self.global_requests) >= self.global_limit:
                # Вычисляем сколько нужно ждать
                oldest_request = self.global_requests[0]
                wait_time = 1.0 - (now - oldest_request)

                if wait_time > 0:
                    logger.debug(f"Global rate limit reached, waiting {wait_time:.3f}s")
                    await asyncio.sleep(wait_time)

                    # Повторно очищаем после ожидания
                    now = time.time()
                    while self.global_requests and (now - self.global_requests[0]) >= 1.0:
                        self.global_requests.popleft()

    async def wait_chat_limit(self, chat_id: int) -> None:
        """Ожидание если достигнут лимит для чата"""
        # Получаем или создаём lock для этого чата
        if chat_id not in self.chat_locks:
            self.chat_locks[chat_id] = asyncio.Lock()

        async with self.chat_locks[chat_id]:
            last_request_time = self.chat_last_request.get(chat_id, 0)
            now = time.time()

            time_since_last = now - last_request_time
            min_interval = 1.0 / self.per_chat_limit

            # Если прошло меньше минимального интервала, ждём
            if time_since_last < min_interval:
                wait_time = min_interval - time_since_last
                logger.debug(f"Chat {chat_id} rate limit, waiting {wait_time:.3f}s")
                await asyncio.sleep(wait_time)

    async def register_request(self, chat_id: Optional[int]) -> None:
        """Регистрация выполненного запроса"""
        now = time.time()

        # Регистрируем в глобальной очереди
        async with self.global_lock:
            self.global_requests.append(now)

        # Регистрируем для конкретного чата
        if chat_id is not None:
            if chat_id not in self.chat_locks:
                self.chat_locks[chat_id] = asyncio.Lock()
            async with self.chat_locks[chat_id]:
                self.chat_last_request[chat_id] = now

    @asynccontextmanager
    async def limit(self, chat_id: Optional[int] = None):
        """
        Context manager для автоматического rate limiting

        Usage:
            async with rate_limiter.limit(chat_id=123):
                await bot.send_message(chat_id=123, text="Hello")
        """
        await self.acquire(chat_id)
        try:
            yield
        finally:
            pass

    def cleanup_old_locks(self, max_locks: int = 1000) -> None:
        """
        Очистка старых locks для чатов (для предотвращения утечки памяти)
        """
        if len(self.chat_locks) > max_locks:
            now = time.time()
            old_chats = [
                chat_id for chat_id, last_time in self.chat_last_request.items()
                if now - last_time > 3600  # Старше 1 часа
            ]

            for chat_id in old_chats[:len(old_chats)//2]:
                self.chat_locks.pop(chat_id, None)
                self.chat_last_request.pop(chat_id, None)

            logger.info(f"Cleaned up {len(old_chats)//2} old chat locks")

    def get_stats(self) -> Dict[str, Any]:
        """Получить статистику использования"""
        return {
            "global_requests_last_second": len(self.global_requests),
            "tracked_chats": len(self.chat_locks),
            "global_limit": self.global_limit,
            "per_chat_limit": self.per_chat_limit,
        }


# Глобальный экземпляр rate limiter
global_rate_limiter: Optional[TelegramRateLimiter] = None


def get_rate_limiter() -> TelegramRateLimiter:
    """Получить глобальный экземпляр rate limiter"""
    global global_rate_limiter
    if global_rate_limiter is None:
        global_rate_limiter = TelegramRateLimiter(
            global_limit=30,
            per_chat_limit=1.0,
        )
    return global_rate_limiter

