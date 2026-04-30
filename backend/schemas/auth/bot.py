from pydantic import BaseModel, Field


class BotLoginRequest(BaseModel):
    telegram_id: int = Field(..., description="Telegram user ID")
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    photo_url: str | None = None
