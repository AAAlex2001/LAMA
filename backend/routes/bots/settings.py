from fastapi import APIRouter, Depends

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.models.bots import CaptchaMode
from backend.schemas.bots import (
    WelcomeSettingsUpdate, WelcomeSettingsResponse,
    AutoApprovalUpdate, AutoApprovalResponse,
)
from backend.services.bot.bot_crud import BotCrudService
from backend.services.bot.bot_settings import BotSettingsService
from backend.routes.bots.dependencies import get_bot_service, get_bot_settings_service

router = APIRouter()


@router.get("/{bot_id}/welcome", response_model=WelcomeSettingsResponse)
async def get_welcome_settings(
    bot_id: int,
    service: BotCrudService = Depends(get_bot_service),
    current_user: User = Depends(get_current_user),
):
    """Получить настройки приветствия."""
    bot = await service.get(bot_id, owner_id=current_user.id)

    return WelcomeSettingsResponse(
        welcome_enabled=bot.welcome_enabled,
        welcome_message=bot.welcome_message,
        welcome_media_url=bot.welcome_media_url,
        welcome_media_type=bot.welcome_media_type,
        welcome_buttons=bot.welcome_buttons,
        welcome_message_thread_id=bot.welcome_message_thread_id,
        welcome_type=getattr(bot, "welcome_type", "group_message"),
        join_captcha_enabled=bot.join_captcha_enabled,
        captcha_mode=getattr(bot, "captcha_mode", CaptchaMode.DISABLED),
        captcha_timeout_seconds=getattr(bot, "captcha_timeout_seconds", 10),
    )


@router.put("/{bot_id}/welcome", response_model=WelcomeSettingsResponse)
async def update_welcome_settings(
    bot_id: int,
    data: WelcomeSettingsUpdate,
    settings: BotSettingsService = Depends(get_bot_settings_service),
    current_user: User = Depends(get_current_user),
):
    """Обновить настройки приветствия."""
    bot = await settings.update_welcome_settings(bot_id, data, owner_id=current_user.id)

    return WelcomeSettingsResponse(
        welcome_enabled=bot.welcome_enabled,
        welcome_message=bot.welcome_message,
        welcome_media_url=bot.welcome_media_url,
        welcome_media_type=bot.welcome_media_type,
        welcome_buttons=bot.welcome_buttons,
        welcome_message_thread_id=bot.welcome_message_thread_id,
        welcome_type=getattr(bot, "welcome_type", "group_message"),
        join_captcha_enabled=bot.join_captcha_enabled,
        captcha_mode=getattr(bot, "captcha_mode", CaptchaMode.DISABLED),
        captcha_timeout_seconds=getattr(bot, "captcha_timeout_seconds", 10),
    )


@router.get("/{bot_id}/auto-approval", response_model=AutoApprovalResponse)
async def get_auto_approval_settings(
    bot_id: int,
    service: BotCrudService = Depends(get_bot_service),
    current_user: User = Depends(get_current_user),
):
    """Получить настройки автоодобрения."""
    bot = await service.get(bot_id, owner_id=current_user.id)

    return AutoApprovalResponse(
        auto_approval_mode=bot.auto_approval_mode,
        approval_criteria=bot.approval_criteria,
    )


@router.put("/{bot_id}/auto-approval", response_model=AutoApprovalResponse)
async def update_auto_approval_settings(
    bot_id: int,
    data: AutoApprovalUpdate,
    settings: BotSettingsService = Depends(get_bot_settings_service),
    current_user: User = Depends(get_current_user),
):
    """Обновить настройки автоодобрения."""
    bot = await settings.update_auto_approval(bot_id, data, owner_id=current_user.id)
    return AutoApprovalResponse(
        auto_approval_mode=bot.auto_approval_mode,
        approval_criteria=bot.approval_criteria,
    )
