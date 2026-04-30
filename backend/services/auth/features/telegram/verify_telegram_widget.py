import hashlib
import hmac
from datetime import datetime, timezone

from fastapi import HTTPException

from backend.services.auth.settings import AuthSettings
from backend.services.auth.types import TelegramAuthData


class VerifyTelegramWidget:
    def __init__(self, settings: AuthSettings):
        self.settings = settings

    def execute(self, auth_data: TelegramAuthData) -> None:
        if self._is_expired(auth_data.auth_date):
            raise HTTPException(status_code=401, detail="Telegram auth data is expired")
        if not self._is_valid_hash(auth_data):
            raise HTTPException(status_code=401, detail="Invalid Telegram authentication data")

    @staticmethod
    def _is_expired(auth_date: int) -> bool:
        now = datetime.now(timezone.utc).timestamp()
        return now - auth_date > 86400

    def _is_valid_hash(self, auth_data: TelegramAuthData) -> bool:
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

        data_check_string = "\n".join(
            f"{key}={value}" for key, value in sorted(check_data.items())
        )
        secret_key = hashlib.sha256(self.settings.bot_token.encode()).digest()
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(computed_hash, auth_data.hash)
