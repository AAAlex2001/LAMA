from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.models.auth import UserRole


class TelegramAccountResponse(BaseModel):
    """Данные TelegramAccount для UserResponse."""

    model_config = ConfigDict(from_attributes=True)

    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    photo_url: str | None = None
    auth_date: datetime
    created_at: datetime
    updated_at: datetime


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: UserRole
    is_active: bool
    email: str | None = None
    email_verified: bool = False
    agree_terms: bool = False
    agree_personal_data: bool = False
    created_at: datetime
    updated_at: datetime
    telegram_account: TelegramAccountResponse | None = None


class UserUpdateRequest(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
