from pydantic import BaseModel, Field

from backend.schemas.auth.users import UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    registration_completed: bool = Field(
        ...,
        description="User has email and accepted required terms",
    )
