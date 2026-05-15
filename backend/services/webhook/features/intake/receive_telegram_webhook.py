"""Точка входа всех Telegram-update'ов в приложение.

Валидирует секретный токен, парсит update, кладёт его в celery — обработка
происходит в воркере, чтобы webhook-эндпоинт отвечал Telegram быстро (он ждёт
ответ < 30 секунд, иначе ретрит).
"""

import logging

from fastapi import Request

from backend.config import TELEGRAM_WEBHOOK_SECRET
from backend.schemas.webhook import TelegramWebhookRequest, WebhookAcceptedResponse
from backend.services.webhook.features.intake.enqueue_telegram_update import (
    EnqueueTelegramUpdate,
)
from backend.services.webhook.features.intake.get_telegram_update import (
    GetTelegramUpdate,
)
from backend.services.webhook.features.intake.validate_webhook_secret import (
    ValidateWebhookSecret,
)

logger = logging.getLogger(__name__)


class ReceiveTelegramWebhook:
    """Принимает HTTP-запрос от Telegram, валидирует и ставит update в очередь."""

    async def execute(
        self,
        request: Request,
        webhook_request: TelegramWebhookRequest,
    ) -> WebhookAcceptedResponse:
        ValidateWebhookSecret().execute(
            webhook_request.secret_token,
            TELEGRAM_WEBHOOK_SECRET,
        )

        if not webhook_request.bot_token:
            logger.warning("Webhook request missing bot_token in URL")
            return WebhookAcceptedResponse(ok=False, error="bot_token is required")

        update = await GetTelegramUpdate().execute(request)
        if not update:
            return WebhookAcceptedResponse(ok=True)

        EnqueueTelegramUpdate().execute(update, webhook_request.bot_token)
        return WebhookAcceptedResponse(ok=True)
