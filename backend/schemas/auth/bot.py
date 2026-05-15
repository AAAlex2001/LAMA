from pydantic import BaseModel, Field


class BotLoginRequest(BaseModel):
    """Запрос на логин через бота (бот передаёт данные юзера)."""

    telegram_id: int = Field(..., description="Telegram user ID")
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    photo_url: str | None = None
