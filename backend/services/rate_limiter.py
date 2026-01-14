import asyncio
import logging
import time
from typing import Optional, Dict, Any, Literal
from contextlib import asynccontextmanager
from collections import deque

logger = logging.getLogger(__name__)


class TelegramRateLimiter:
    """
    Rate Limiter для Telegram Bot API с соблюдением официальных ограничений:
    - 1 сообщение в секунду конкретному пользователю
    - До 30 сообщений в секунду разным пользователям (глобально)
    - До 20 сообщений в минуту в одну группу
    """

    def __init__(
        self,
        per_user_delay: float = 1.0,  # 1 сообщение в секунду на пользователя
        global_rate: int = 30,  # 30 сообщений в секунду глобально
        per_group_limit: int = 20,  # 20 сообщений в минуту на группу
        per_group_window: float = 60.0,  # окно в 60 секунд для групп
    ):
        """
        Args:
            per_user_delay: Задержка между сообщениями одному пользователю (секунды)
            global_rate: Максимальное количество сообщений в секунду глобально
            per_group_limit: Максимальное количество сообщений в минуту для группы
            per_group_window: Временное окно для подсчёта сообщений в группу (секунды)
        """
        # Per-chat delays (для пользователей и групп)
        self.per_user_delay = per_user_delay
        self.chat_last_request: Dict[int, float] = {}
        self.chat_locks: Dict[int, asyncio.Lock] = {}
        self.locks_lock = asyncio.Lock()

        # Global rate limiting (30 сообщений в секунду)
        self.global_rate = global_rate
        self.global_lock = asyncio.Lock()
        self.global_requests: deque = deque()  # timestamps последних запросов

        # Per-group rate limiting (20 сообщений в минуту)
        self.per_group_limit = per_group_limit
        self.per_group_window = per_group_window
        self.group_requests: Dict[int, deque] = {}  # chat_id -> deque of timestamps

    async def get_chat_lock(self, chat_id: int) -> asyncio.Lock:
        """Получить или создать lock для чата"""
        if chat_id not in self.chat_locks:
            async with self.locks_lock:
                if chat_id not in self.chat_locks:
                    self.chat_locks[chat_id] = asyncio.Lock()
        return self.chat_locks[chat_id]

    def _is_group_chat(self, chat_id: int) -> bool:
        """Определить, является ли chat_id группой/супергруппой"""
        # Отрицательные ID с абсолютным значением > 1000000000000 - супергруппы
        # Отрицательные ID < 1000000000000 - обычные группы
        return chat_id < 0

    async def _check_global_limit(self):
        """Проверить глобальный лимит (30 сообщений в секунду)"""
        async with self.global_lock:
            now = time.monotonic()
            
            # Удалить запросы старше 1 секунды
            while self.global_requests and now - self.global_requests[0] > 1.0:
                self.global_requests.popleft()
            
            # Если достигли лимита, ждём
            if len(self.global_requests) >= self.global_rate:
                oldest_request = self.global_requests[0]
                wait_time = 1.0 - (now - oldest_request)
                if wait_time > 0:
                    logger.info(f"[RateLimit] Global limit reached, waiting {wait_time:.3f}s")
                    await asyncio.sleep(wait_time)
                    # Очистить старые записи после ожидания
                    now = time.monotonic()
                    while self.global_requests and now - self.global_requests[0] > 1.0:
                        self.global_requests.popleft()
            
            # Добавить текущий запрос
            self.global_requests.append(now)

    async def _check_group_limit(self, chat_id: int):
        """Проверить лимит для группы (20 сообщений в минуту)"""
        if chat_id not in self.group_requests:
            self.group_requests[chat_id] = deque()
        
        requests = self.group_requests[chat_id]
        now = time.monotonic()
        
        # Удалить запросы старше окна (60 секунд)
        while requests and now - requests[0] > self.per_group_window:
            requests.popleft()
        
        # Если достигли лимита, ждём
        if len(requests) >= self.per_group_limit:
            oldest_request = requests[0]
            wait_time = self.per_group_window - (now - oldest_request)
            if wait_time > 0:
                logger.info(
                    f"[RateLimit] Group {chat_id} limit reached, waiting {wait_time:.3f}s"
                )
                await asyncio.sleep(wait_time)
                # Очистить старые записи после ожидания
                now = time.monotonic()
                while requests and now - requests[0] > self.per_group_window:
                    requests.popleft()
        
        # Добавить текущий запрос
        requests.append(now)

    @asynccontextmanager
    async def limit(self, chat_id: Optional[int] = None, weight: int = 1):
        """
        Context manager для автоматического rate limiting.
        Применяет все необходимые ограничения Telegram:
        - Глобальный лимит (30 сообщений/сек)
        - Per-user лимит (1 сообщение/сек на пользователя)
        - Per-group лимит (20 сообщений/мин на группу)

        Usage:
            async with rate_limiter.limit(chat_id=123):
                await bot.send_message(chat_id=123, text="Hello")
        """
        if chat_id is None:
            yield
            return

        if weight < 1:
            weight = 1

        # 1. Проверить глобальный лимит (для всех типов чатов)
        await self._check_global_limit()

        # 2. Проверить специфичные лимиты для группы
        is_group = self._is_group_chat(chat_id)
        if is_group:
            await self._check_group_limit(chat_id)

        # 3. Применить per-chat delay (для пользователей - 1 сек, для групп тоже)
        lock = await self.get_chat_lock(chat_id)

        async with lock:
            if chat_id in self.chat_last_request:
                elapsed = time.monotonic() - self.chat_last_request[chat_id]
                wait_time = (self.per_user_delay * weight) - elapsed

                if wait_time > 0:
                    chat_type = "group" if is_group else "user"
                    logger.info(
                        f"[RateLimit] {chat_type} {chat_id}: waiting {wait_time:.3f}s"
                    )
                    await asyncio.sleep(wait_time)

            chat_type = "group" if is_group else "user"
            logger.info(
                f"[RateLimit] {chat_type} {chat_id}: executing request (weight={weight})"
            )
            try:
                yield
            finally:
                self.chat_last_request[chat_id] = time.monotonic()
                logger.info(f"[RateLimit] {chat_type} {chat_id}: request completed")

    def cleanup_old_locks(self, max_locks: int = 1000) -> None:
        """
        Очистка старых locks и данных для чатов
        """
        if len(self.chat_locks) > max_locks:
            now = time.time()
            old_chats = [
                chat_id for chat_id, last_time in self.chat_last_request.items()
                if now - last_time > 3600
            ]

            for chat_id in old_chats[:len(old_chats)//2]:
                self.chat_locks.pop(chat_id, None)
                self.chat_last_request.pop(chat_id, None)
                self.group_requests.pop(chat_id, None)

            logger.info(f"Cleaned up {len(old_chats)//2} old chat locks")

    def get_stats(self) -> Dict[str, Any]:
        """Получить статистику использования"""
        return {
            "tracked_chats": len(self.chat_locks),
            "tracked_groups": len(self.group_requests),
            "global_requests_last_second": len(self.global_requests),
            "per_user_delay": self.per_user_delay,
            "global_rate_limit": self.global_rate,
            "per_group_limit": self.per_group_limit,
        }


global_rate_limiter: Optional[TelegramRateLimiter] = None


def get_rate_limiter() -> TelegramRateLimiter:
    """Получить глобальный экземпляр rate limiter"""
    global global_rate_limiter
    if global_rate_limiter is None:
        global_rate_limiter = TelegramRateLimiter(
            per_user_delay=1.0,  # 1 сообщение в секунду на пользователя
            global_rate=30,  # 30 сообщений в секунду глобально
            per_group_limit=20,  # 20 сообщений в минуту на группу
            per_group_window=60.0,  # окно 60 секунд
        )
    return global_rate_limiter
