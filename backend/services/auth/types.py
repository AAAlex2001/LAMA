from dataclasses import dataclass

from backend.models.auth import User


@dataclass(frozen=True)
class ClientContext:
    user_agent: str | None = None
    ip_address: str | None = None


@dataclass(frozen=True)
class TelegramAuthData:
    id: int
    first_name: str
    last_name: str | None
    username: str | None
    photo_url: str | None
    auth_date: int
    hash: str


@dataclass(frozen=True)
class AuthResult:
    user: User
    access_token: str
    refresh_token: str
