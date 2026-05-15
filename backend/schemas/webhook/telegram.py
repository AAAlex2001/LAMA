from pydantic import BaseModel


class TelegramWebhookRequest(BaseModel):
    """Запрос от Telegram: bot_token из URL + secret_token из header."""

    bot_token: str
    secret_token: str | None = None
