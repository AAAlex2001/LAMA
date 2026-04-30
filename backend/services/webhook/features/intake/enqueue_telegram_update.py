import asyncio
import logging

from aiogram.types import Update

from backend.services.webhook.features.dispatch.route_telegram_update import (
    RouteTelegramUpdate,
)

logger = logging.getLogger(__name__)


class EnqueueTelegramUpdate:
    def execute(self, update: Update, bot_token: str) -> None:
        task = asyncio.create_task(
            RouteTelegramUpdate().execute(update, bot_token),
            name="telegram-webhook-route",
        )
        task.add_done_callback(self.log_result)

    @staticmethod
    def log_result(task: asyncio.Task) -> None:
        if task.cancelled():
            logger.warning("Webhook route task was cancelled")
            return

        exc = task.exception()
        if exc:
            logger.error("Webhook route failed: %s", exc, exc_info=exc)
