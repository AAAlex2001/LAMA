"""
Rate Limiter для Telegram API запросов
Простой per-chat rate limiter: 1 запрос в секунду на чат.
Разные чаты могут отправлять параллельно.
"""
import asyncio
import logging
import time
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


class TelegramRateLimiter:
    """
    Простой Rate Limiter: 1 запрос в секунду на каждый chat_id.
    Разные чаты работают параллельно без глобальных ограничений.
    """

    def __init__(self, per_chat_delay: float = 1.0):
        """
        Args:
            per_chat_delay: Задержка между запросами к одному чату (в секундах)
        """
        self.per_chat_delay = per_chat_delay
        
        # Словарь для хранения последнего запроса к каждому чату
        self.chat_last_request: Dict[int, float] = {}
        self.chat_locks: Dict[int, asyncio.Lock] = {}
        # Lock для безопасного создания chat_locks
        self._locks_lock = asyncio.Lock()

    async def get_chat_lock(self, chat_id: int) -> asyncio.Lock:
        """Получить или создать lock для чата (thread-safe)"""
        if chat_id not in self.chat_locks:
            async with self._locks_lock:
                # Double-check после получения lock
                if chat_id not in self.chat_locks:
                    self.chat_locks[chat_id] = asyncio.Lock()
        return self.chat_locks[chat_id]

    @asynccontextmanager
    async def limit(self, chat_id: Optional[int] = None):
        """
        Context manager для автоматического rate limiting.
        Lock удерживается на время ожидания + выполнения запроса.

        Usage:
            async with rate_limiter.limit(chat_id=123):
                await bot.send_message(chat_id=123, text="Hello")
        """
        if chat_id is None:
            # Нет ограничений, если chat_id не указан
            yield
            return
        
        lock = await self.get_chat_lock(chat_id)
        
        async with lock:
            # Проверяем, нужно ли ждать
            if chat_id in self.chat_last_request:
                elapsed = time.monotonic() - self.chat_last_request[chat_id]
                wait_time = self.per_chat_delay - elapsed
                
                if wait_time > 0:
                    logger.info(f"[RateLimit] chat {chat_id}: waiting {wait_time:.3f}s")
                    await asyncio.sleep(wait_time)
            
            logger.info(f"[RateLimit] chat {chat_id}: executing request")
            # Выполняем запрос (yield внутри lock!)
            try:
                yield
            finally:
                # Регистрируем время ПОСЛЕ выполнения
                self.chat_last_request[chat_id] = time.monotonic()
                logger.info(f"[RateLimit] chat {chat_id}: request completed")

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
            "tracked_chats": len(self.chat_locks),
            "per_chat_delay": self.per_chat_delay,
        }


# Глобальный экземпляр rate limiter
global_rate_limiter: Optional[TelegramRateLimiter] = None


def get_rate_limiter() -> TelegramRateLimiter:
    """Получить глобальный экземпляр rate limiter"""
    global global_rate_limiter
    if global_rate_limiter is None:
        global_rate_limiter = TelegramRateLimiter(
            per_chat_delay=3.0,
        )
    return global_rate_limiter


