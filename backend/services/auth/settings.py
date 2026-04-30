import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AuthSettings:
    bot_token: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    refresh_token_expire_days: int = 30


def load_auth_settings() -> AuthSettings:
    return AuthSettings(
        bot_token=os.getenv("TELEGRAM_BOT_TOKEN", ""),
        jwt_secret=os.getenv("JWT_SECRET", ""),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24))),
        refresh_token_expire_days=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30")),
    )
