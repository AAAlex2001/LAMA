import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt

from backend.services.auth.settings import AuthSettings


class CreateAccessToken:
    def __init__(self, settings: AuthSettings):
        self.settings = settings

    def execute(self, user_id: int) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user_id),
            "type": "access",
            "exp": now + timedelta(minutes=self.settings.access_token_expire_minutes),
            "iat": now,
            "jti": secrets.token_urlsafe(16),
        }
        return jwt.encode(
            payload,
            self.settings.jwt_secret,
            algorithm=self.settings.jwt_algorithm,
        )
