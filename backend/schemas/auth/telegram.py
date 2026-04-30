from pydantic import BaseModel, Field


class TelegramAuthPayload(BaseModel):
    id: int = Field(..., description="Telegram user ID")
    first_name: str = Field(..., description="Telegram first name")
    last_name: str | None = Field(None, description="Telegram last name")
    username: str | None = Field(None, description="Telegram username")
    photo_url: str | None = Field(None, description="Telegram profile photo URL")
    auth_date: int = Field(..., description="Telegram auth timestamp")
    hash: str = Field(..., description="Telegram auth hash")
