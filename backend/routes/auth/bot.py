from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth.dependencies import get_auth_settings, get_client_context
from backend.routes.auth.responses import build_auth_response
from backend.schemas.auth import AuthResponse, BotLoginRequest
from backend.services.auth.features.bot.authenticate_bot_user import AuthenticateBotUser
from backend.services.auth.settings import AuthSettings

router = APIRouter()


@router.post(
    "/bot-login",
    response_model=AuthResponse,
    summary="Логин через бота",
    description=(
        "Bot-side флоу: бот уже получил `telegram_id` от Telegram (через `/start` "
        "или другое событие) и вызывает API сам. HMAC-проверки нет — бот доверенный. "
        "Делает upsert юзера и сразу отдаёт access/refresh + флаг `registration_completed`."
    ),
)
async def login_with_bot(
    login_data: BotLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: AuthSettings = Depends(get_auth_settings),
):
    result = await AuthenticateBotUser(db, settings).execute(
        telegram_id=login_data.telegram_id,
        username=login_data.username,
        first_name=login_data.first_name,
        last_name=login_data.last_name,
        photo_url=login_data.photo_url,
        context=get_client_context(request),
    )
    return build_auth_response(result, settings)


@router.post(
    "/bot-guest-token",
    response_model=AuthResponse,
    summary="Гостевой токен через бота",
    description=(
        "Тот же логин что и `/bot-login`, но в ответе всегда `registration_completed=false`. "
        "Фронт по этому флагу показывает экран дорегистрации (email + согласия)."
    ),
)
async def create_guest_token_for_bot(
    login_data: BotLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: AuthSettings = Depends(get_auth_settings),
):
    result = await AuthenticateBotUser(db, settings).execute(
        telegram_id=login_data.telegram_id,
        username=login_data.username,
        first_name=login_data.first_name,
        last_name=login_data.last_name,
        photo_url=login_data.photo_url,
        context=get_client_context(request),
    )
    return build_auth_response(result, settings, completed=False)
