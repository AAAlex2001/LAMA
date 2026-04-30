from pydantic import BaseModel


class TelegramWebhookRequest(BaseModel):
    bot_token: str
    secret_token: str | None = None
