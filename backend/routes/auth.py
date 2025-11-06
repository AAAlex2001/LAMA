from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends, Request
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
from backend.services.auth_service import AuthService


router = APIRouter(prefix="/auth", tags=["auth"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


def get_auth_service(request: Request) -> AuthService:
    return request.app.state.auth_service


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
async def register(body: RegistrationModel, auth: AuthService = Depends(get_auth_service)) -> AuthSuccessResponse:
    if not body.email or not body.password.get_secret_value():
        raise HTTPException(status_code=400, detail="Invalid email or password")
    try:
        user = await auth.register_user(body.email, body.password.get_secret_value())
        return AuthSuccessResponse(message="registered", user_email=user.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse, responses={401: {"model": AuthErrorResponse}})
async def login(body: LoginModel, request: Request, auth: AuthService = Depends(get_auth_service)) -> TokenResponse:
    try:
        user = await auth.authenticate_user(body.email, body.password.get_secret_value())
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Issue tokens (access returned; refresh can be retrieved via /refresh flow)
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    access_token, refresh_token = await auth.issue_tokens(user, user_agent=ua, ip=ip)
    return TokenResponse(access_token=access_token)


@router.post("/login/telegram", response_model=TelegramAuthResponse, responses={401: {"model": AuthErrorResponse}})
async def login_telegram(payload: TelegramAuthModel, request: Request, auth: AuthService = Depends(get_auth_service)) -> TelegramAuthResponse:
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        raise HTTPException(status_code=500, detail="Telegram bot token is not configured")
    if not verify_telegram_hash(payload, bot_token):
        raise HTTPException(status_code=401, detail="Invalid Telegram signature")
    # Find or create user by telegram_id, then issue tokens
    user = await auth.get_or_create_telegram_user(
        telegram_id=payload.id,
        email_hint=None,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    access_token, _ = await auth.issue_tokens(user, user_agent=ua, ip=ip)
    return TelegramAuthResponse(success=True, user_id=payload.id, token=access_token)


@router.post("/refresh", response_model=RefreshResponse, responses={401: {"model": AuthErrorResponse}})
async def refresh(body: RefreshRequest, request: Request, auth: AuthService = Depends(get_auth_service)) -> RefreshResponse:
    try:
        ua = request.headers.get("user-agent")
        ip = request.client.host if request.client else None
        access, refresh = await auth.refresh_tokens(body.refresh_token, user_agent=ua, ip=ip)
        return RefreshResponse(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


class LogoutRequest(BaseModel):
    refresh_token: str


@router.post("/logout")
async def logout(body: LogoutRequest, auth: AuthService = Depends(get_auth_service)) -> dict:
    await auth.revoke_refresh(body.refresh_token)
    return {"success": True}


class MeResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


def get_bearer_token(request: Request) -> str:
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return auth_header.split(" ", 1)[1]


@router.get("/me", response_model=MeResponse)
async def me(request: Request, auth: AuthService = Depends(get_auth_service)) -> MeResponse:
    token = get_bearer_token(request)
    try:
        data = auth.decode_access_token(token)
        user_id = data.get("sub")
        import uuid as _uuid
        user = await auth.get_user_by_id(_uuid.UUID(user_id))
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return MeResponse(id=str(user.id), email=user.email, first_name=user.first_name, last_name=user.last_name)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")



