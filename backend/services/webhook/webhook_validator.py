from fastapi import HTTPException

def validate_webhook_secret(secret: str, expected: str):
    if expected and secret != expected:
        raise HTTPException(status_code=401, detail="invalid secret")
