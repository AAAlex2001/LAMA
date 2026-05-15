from pydantic import BaseModel, Field

from backend.schemas.auth.users import UserResponse


class RefreshTokenRequest(BaseModel):
    """Запрос обновления токенов с refresh-токеном."""

    refresh_token: str


class AuthResponse(BaseModel):
    """Ответ логина: access + refresh + user + registration_completed."""

    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    registration_completed: bool = Field(
        ...,
        description="User has email and accepted required terms",
    )
