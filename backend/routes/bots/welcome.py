from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.models.bots import CaptchaMode
from backend.routes.auth import get_current_user
from backend.schemas.bots.welcome import WelcomeSettingsResponse, WelcomeSettingsUpdate
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.settings.update_welcome_settings import UpdateWelcomeSettings

router = APIRouter()


def build_welcome_response(bot) -> WelcomeSettingsResponse:
    return WelcomeSettingsResponse(
        welcome_enabled=bot.welcome_enabled,
        welcome_message=bot.welcome_message,
        welcome_media_url=bot.welcome_media_url,
        welcome_media_type=bot.welcome_media_type,
        welcome_buttons=bot.welcome_buttons,
        welcome_message_thread_id=bot.welcome_message_thread_id,
        welcome_type=getattr(bot, "welcome_type", None) or "group_message",
        join_captcha_enabled=bot.join_captcha_enabled,
        captcha_mode=getattr(bot, "captcha_mode", CaptchaMode.DISABLED),
        captcha_timeout_seconds=getattr(bot, "captcha_timeout_seconds", 10),
    )


@router.get("/{bot_id}/welcome", response_model=WelcomeSettingsResponse)
async def get_welcome_settings(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = await find_bot_or_404(db, bot_id, owner_id=current_user.id)
    return build_welcome_response(bot)


@router.put("/{bot_id}/welcome", response_model=WelcomeSettingsResponse)
async def update_welcome_settings(
    bot_id: int,
    data: WelcomeSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = await UpdateWelcomeSettings(db).execute(bot_id, data, owner_id=current_user.id)
    return build_welcome_response(bot)
