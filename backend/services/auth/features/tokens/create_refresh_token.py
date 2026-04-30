import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt

from backend.services.auth.settings import AuthSettings


class CreateRefreshToken:
    def __init__(self, settings: AuthSettings):
        self.settings = settings

    def execute(self, user_id: int) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user_id),
            "type": "refresh",
            "exp": now + timedelta(days=self.settings.refresh_token_expire_days),
            "iat": now,
            "jti": secrets.token_urlsafe(16),
        }
        return jwt.encode(
            payload,
            self.settings.jwt_secret,
            algorithm=self.settings.jwt_algorithm,
        )
