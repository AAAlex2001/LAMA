import logging

from aiogram.types import Update
from fastapi import Request

logger = logging.getLogger(__name__)


class GetTelegramUpdate:
    """Парсит JSON-тело webhook-запроса в aiogram.Update; None при ошибке."""

    async def execute(self, request: Request) -> Update | None:
        try:
            payload = await request.json()
            if not payload:
                logger.warning("Empty webhook payload received")
                return None
            return Update.model_validate(payload)
        except Exception as exc:
            logger.warning("Invalid update payload: %s", exc)
            return None
