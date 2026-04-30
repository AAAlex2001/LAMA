from fastapi import APIRouter, Header, Request

from backend.schemas.webhook import TelegramWebhookRequest, WebhookAcceptedResponse
from backend.services.webhook.features.intake.receive_telegram_webhook import (
    ReceiveTelegramWebhook,
)

router = APIRouter()


@router.post(
    "/telegram/webhook/{bot_token}",
    response_model=WebhookAcceptedResponse,
)
async def telegram_webhook(
    request: Request,
    bot_token: str,
    x_telegram_bot_api_secret_token: str | None = Header(None),
):
    return await ReceiveTelegramWebhook().execute(
        request=request,
        webhook_request=TelegramWebhookRequest(
            bot_token=bot_token,
            secret_token=x_telegram_bot_api_secret_token,
        ),
    )
