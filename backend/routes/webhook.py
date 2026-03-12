"""
Telegram Webhook роутер
"""
import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Request, Header
from backend.services.webhook.webhook_validator import validate_webhook_secret
from aiogram.types import Update

from backend.config import TELEGRAM_WEBHOOK_SECRET
from backend.services.webhook import WebhookDispatcher

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/telegram/webhook/{bot_token}")
async def telegram_webhook(
    request: Request,
    bot_token: str,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None),
):
    """
    Telegram Webhook handler
    - Быстрый ответ Telegram (< 50ms)
    - Параллельная обработка независимых задач
    - Graceful error handling
    """
    # Валидация секрета (если задан)

    validate_webhook_secret(x_telegram_bot_api_secret_token, TELEGRAM_WEBHOOK_SECRET)

    # Парсинг payload
    try:
        payload = await request.json()
        update = Update.model_validate(payload)
    except Exception as e:
        logger.warning(f"Invalid update payload: {e}")
        return {"ok": True}

    # Запускаем обработку в фоне
    if not bot_token:
        import os
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    asyncio.create_task(WebhookDispatcher.dispatch(update, bot_token))

    return {"ok": True}
