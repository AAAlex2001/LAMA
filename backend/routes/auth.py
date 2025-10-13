from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import hmac
import hashlib
import os

from backend.models.auth_models import (
    RegistrationModel,
    LoginModel,
    AuthSuccessResponse,
    AuthErrorResponse,
    TelegramAuthModel,
    TelegramAuthResponse,
)


router = APIRouter(prefix="/auth", tags=["auth"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


async def issue_token_for_user(user_identifier: str) -> str:
    # Stub: replace with real token issuing (e.g., JWT)
    return f"fake-token-for:{user_identifier}"


def verify_telegram_hash(payload: TelegramAuthModel, bot_token: str) -> bool:
    data_pairs = []
    for key in [
        "auth_date",
        "first_name",
        "id",
        "last_name",
        "photo_url",
        "username",
    ]:
        value = getattr(payload, key, None)
        if value is None:
            continue
        data_pairs.append(f"{key}={value}")
    data_check_string = "\n".join(sorted(data_pairs))
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    hmac_digest = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(hmac_digest, payload.hash)


@router.post("/register", response_model=AuthSuccessResponse, responses={400: {"model": AuthErrorResponse}})
async def register(body: RegistrationModel) -> AuthSuccessResponse:
    # TODO: add unique email check and persistence
    if not body.email or not body.password.get_secret_value():
        raise HTTPException(status_code=400, detail="Invalid email or password")
    return AuthSuccessResponse(message="registered", user_email=body.email)


@router.post("/login", response_model=TokenResponse, responses={401: {"model": AuthErrorResponse}})
async def login(body: LoginModel) -> TokenResponse:
    # TODO: validate credentials
    valid = bool(body.email and body.password.get_secret_value())
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = await issue_token_for_user(body.email)
    return TokenResponse(access_token=token)


@router.post("/login/telegram", response_model=TelegramAuthResponse, responses={401: {"model": AuthErrorResponse}})
async def login_telegram(payload: TelegramAuthModel) -> TelegramAuthResponse:
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        raise HTTPException(status_code=500, detail="Telegram bot token is not configured")
    if not verify_telegram_hash(payload, bot_token):
        raise HTTPException(status_code=401, detail="Invalid Telegram signature")
    token = await issue_token_for_user(str(payload.id))
    return TelegramAuthResponse(success=True, user_id=payload.id, token=token)


