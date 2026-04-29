import logging

from backend.services.rate_limiter import RateLimitTimeout
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)


class SafeDeleteMessage:
    """Удаляет сообщение в Telegram и возвращает строку-результат для логов celery."""

    def __init__(self, bot: RateLimitedBot) -> None:
        self.bot = bot

    async def execute(self, chat_id: int, message_id: int) -> str:
        """Возвращает ``deleted:...`` / ``rate_limited:N`` / ``failed:...`` — для логов."""
        try:
            await self.bot.delete_message(chat_id=chat_id, message_id=message_id)
            return f"deleted:{chat_id}/{message_id}"
        except RateLimitTimeout as exc:
            return f"rate_limited:{int(exc.wait_seconds) + 1}"
        except Exception as exc:
            logger.warning("safe_delete failed: chat=%s msg=%s error=%s", chat_id, message_id, exc)
            return f"failed:{chat_id}/{message_id}:{exc}"
