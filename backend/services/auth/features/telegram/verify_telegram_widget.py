import hashlib
import hmac
from datetime import datetime, timezone

from fastapi import HTTPException

from backend.services.auth.settings import AuthSettings
from backend.services.auth.types import TelegramAuthData

AUTH_DATE_MAX_AGE_SECONDS = 86400


def compute_widget_hash(bot_token: str, auth_data: TelegramAuthData) -> str:
    check_data = {
        "auth_date": str(auth_data.auth_date),
        "first_name": auth_data.first_name,
        "id": str(auth_data.id),
    }
    if auth_data.last_name:
        check_data["last_name"] = auth_data.last_name
    if auth_data.username:
        check_data["username"] = auth_data.username
    if auth_data.photo_url:
        check_data["photo_url"] = auth_data.photo_url

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(check_data.items()))
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    return hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()


class VerifyTelegramWidget:
    """Проверяет подпись Telegram Login Widget по HMAC-SHA256 + свежесть `auth_date`."""

    def __init__(self, settings: AuthSettings):
        self.settings = settings

    def execute(self, auth_data: TelegramAuthData) -> None:
        now = datetime.now(timezone.utc).timestamp()
        if now - auth_data.auth_date > AUTH_DATE_MAX_AGE_SECONDS:
            raise HTTPException(status_code=401, detail="Telegram auth data is expired")

        computed = compute_widget_hash(self.settings.bot_token, auth_data)
        if not hmac.compare_digest(computed, auth_data.hash):
            raise HTTPException(status_code=401, detail="Invalid Telegram authentication data")
