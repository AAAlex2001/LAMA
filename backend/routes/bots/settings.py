from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.models.bots import CaptchaMode
from backend.schemas.bots import (
    WelcomeSettingsUpdate, WelcomeSettingsResponse,
    AutoApprovalUpdate, AutoApprovalResponse,
)
from backend.routes.bots.dependencies import get_update_auto_approval, get_update_welcome_settings
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.settings.update_auto_approval import UpdateAutoApproval
from backend.services.bot.features.settings.update_welcome_settings import UpdateWelcomeSettings

router = APIRouter()


@router.get("/{bot_id}/welcome", response_model=WelcomeSettingsResponse)
async def get_welcome_settings(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить настройки приветствия."""
    bot = await find_bot_or_404(db, bot_id, owner_id=current_user.id)

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


@router.put("/{bot_id}/welcome", response_model=WelcomeSettingsResponse)
async def update_welcome_settings(
    bot_id: int,
    data: WelcomeSettingsUpdate,
    update_settings: UpdateWelcomeSettings = Depends(get_update_welcome_settings),
    current_user: User = Depends(get_current_user),
):
    """Обновить настройки приветствия."""
    bot = await update_settings.execute(bot_id, data, owner_id=current_user.id)

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


@router.get("/{bot_id}/auto-approval", response_model=AutoApprovalResponse)
async def get_auto_approval_settings(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить настройки автоодобрения."""
    bot = await find_bot_or_404(db, bot_id, owner_id=current_user.id)

    return AutoApprovalResponse(
        auto_approval_mode=bot.auto_approval_mode,
        approval_criteria=bot.approval_criteria,
    )


@router.put("/{bot_id}/auto-approval", response_model=AutoApprovalResponse)
async def update_auto_approval_settings(
    bot_id: int,
    data: AutoApprovalUpdate,
    update_auto_approval: UpdateAutoApproval = Depends(get_update_auto_approval),
    current_user: User = Depends(get_current_user),
):
    """Обновить настройки автоодобрения."""
    bot = await update_auto_approval.execute(bot_id, data, owner_id=current_user.id)
    return AutoApprovalResponse(
        auto_approval_mode=bot.auto_approval_mode,
        approval_criteria=bot.approval_criteria,
    )
