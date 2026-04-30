from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth.dependencies import get_auth_settings, get_client_context
from backend.routes.auth.responses import build_auth_response
from backend.schemas.auth import AuthResponse, TelegramAuthPayload
from backend.services.auth.features.telegram.authenticate_telegram_widget import (
    AuthenticateTelegramWidget,
)
from backend.services.auth.settings import AuthSettings
from backend.services.auth.types import TelegramAuthData

router = APIRouter()


@router.post("/telegram", response_model=AuthResponse)
async def login_with_telegram(
    auth_data: TelegramAuthPayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: AuthSettings = Depends(get_auth_settings),
):
    result = await AuthenticateTelegramWidget(db, settings).execute(
        auth_data=TelegramAuthData(
            id=auth_data.id,
            first_name=auth_data.first_name,
            last_name=auth_data.last_name,
            username=auth_data.username,
            photo_url=auth_data.photo_url,
            auth_date=auth_data.auth_date,
            hash=auth_data.hash,
        ),
        context=get_client_context(request),
    )
    return build_auth_response(result, settings)
