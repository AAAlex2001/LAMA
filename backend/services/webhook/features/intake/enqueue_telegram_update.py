import logging

from aiogram.types import Update

from backend.celery.telegram_tasks import (
    PROCESS_TELEGRAM_UPDATE_TASK,
)
from backend.celery.app import celery_app

logger = logging.getLogger(__name__)


class EnqueueTelegramUpdate:
    def execute(self, update: Update, bot_token: str) -> None:
        celery_app.send_task(
            PROCESS_TELEGRAM_UPDATE_TASK,
            args=[update.model_dump(mode="json", by_alias=True, exclude_none=True), bot_token],
            queue="webhook",
        )
