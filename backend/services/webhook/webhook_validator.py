import logging
import secrets

from fastapi import HTTPException

logger = logging.getLogger(__name__)

def validate_webhook_secret(secret: str, expected: str):
    if not expected:
        logger.warning("TELEGRAM_WEBHOOK_SECRET is not configured — webhook secret validation skipped")
        return
    if not secret or not secrets.compare_digest(str(secret), str(expected)):
        raise HTTPException(status_code=401, detail="invalid secret")
