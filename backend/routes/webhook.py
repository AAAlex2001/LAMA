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

    validate_webhook_secret(x_telegram_bot_api_secret_token, TELEGRAM_WEBHOOK_SECRET)

    try:
        body = await request.body()
        if not body:
            logger.warning("Empty webhook payload received")
            return {"ok": True}
            
        payload = await request.json()
        update = Update.model_validate(payload)
    except Exception as e:
        logger.warning("Invalid update payload: %s", e)
        return {"ok": True}

    if not bot_token:
        logger.warning("Webhook request missing bot_token in URL")
        return {"ok": False, "error": "bot_token is required"}
    task = asyncio.create_task(WebhookDispatcher.dispatch(update, bot_token))
    task.add_done_callback(lambda t: logger.error("Webhook dispatch failed: %s", t.exception()) if t.exception() else None)

    return {"ok": True}
