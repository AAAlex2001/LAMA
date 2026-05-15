"""Запуск обработки update'а в фоне через asyncio (НЕ через celery).

Webhook-эндпоинт должен ответить Telegram-у быстро (< 30 сек), поэтому реальная
обработка летит в `asyncio.create_task`. Если задача упадёт — exception
залогируется через done-callback, ответ Telegram'у это не сломает.
"""

import asyncio
import logging

from aiogram.types import Update

from backend.services.webhook.features.dispatch.route_telegram_update import (
    RouteTelegramUpdate,
)

logger = logging.getLogger(__name__)


class EnqueueTelegramUpdate:
    """Запускает обработку update'а в asyncio task и возвращается мгновенно."""

    def execute(self, update: Update, bot_token: str) -> None:
        task = asyncio.create_task(
            RouteTelegramUpdate().execute(update, bot_token),
            name="telegram-webhook-route",
        )
        task.add_done_callback(self.log_result)

    @staticmethod
    def log_result(task: asyncio.Task) -> None:
        """Done-callback: логирует cancel или exception, не пробрасывая их выше."""
        if task.cancelled():
            logger.warning("Webhook route task was cancelled")
            return

        exc = task.exception()
        if exc:
            logger.error("Webhook route failed: %s", exc, exc_info=exc)
