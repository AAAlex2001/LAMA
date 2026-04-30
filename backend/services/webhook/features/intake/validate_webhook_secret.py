import logging
import secrets

from fastapi import HTTPException

logger = logging.getLogger(__name__)


class ValidateWebhookSecret:
    def execute(self, secret: str | None, expected: str | None) -> None:
        if not expected:
            logger.warning("TELEGRAM_WEBHOOK_SECRET is not configured; validation skipped")
            return
        if not secret or not secrets.compare_digest(str(secret), str(expected)):
            raise HTTPException(status_code=401, detail="invalid secret")
