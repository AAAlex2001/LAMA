from fastapi import APIRouter, Header, Path, Request

from backend.schemas.webhook import TelegramWebhookRequest, WebhookAcceptedResponse
from backend.services.webhook.features.intake.receive_telegram_webhook import (
    ReceiveTelegramWebhook,
)

router = APIRouter()


@router.post(
    "/telegram/webhook/{bot_token}",
    response_model=WebhookAcceptedResponse,
    summary="Приём update'ов от Telegram (по одному эндпоинту на бота)",
)
async def telegram_webhook(
    request: Request,
    bot_token: str = Path(
        ...,
        description=(
            "Токен бота из URL — Telegram шлёт апдейты на /api/telegram/webhook/{TOKEN}. "
            "Используется чтобы найти соответствующий Bot в БД и обработать апдейт от его имени."
        ),
    ),
    x_telegram_bot_api_secret_token: str | None = Header(
        None,
        description="Секретный токен из заголовка (защита от подделки запросов).",
    ),
):
    return await ReceiveTelegramWebhook().execute(
        request=request,
        webhook_request=TelegramWebhookRequest(
            bot_token=bot_token,
            secret_token=x_telegram_bot_api_secret_token,
        ),
    )
