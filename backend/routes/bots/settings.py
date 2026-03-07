from fastapi import APIRouter, Depends, HTTPException

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.models.bots import CaptchaMode
from backend.schemas.bots import (
    WelcomeSettingsUpdate,
    WelcomeSettingsResponse,
    AutoApprovalUpdate,
    AutoApprovalResponse,
)
from backend.services.bot.bot_service import BotService
from backend.routes.bots.dependencies import get_bot_service

router = APIRouter()

@router.get("/{bot_id}/welcome", response_model=WelcomeSettingsResponse)        
async def get_welcome_settings(
        bot_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить настройки приветствия"""
    bot = await service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    return WelcomeSettingsResponse(
        welcome_enabled=bot.welcome_enabled,
        welcome_message=bot.welcome_message,
        welcome_media_url=bot.welcome_media_url,
        welcome_media_type=bot.welcome_media_type,
        welcome_buttons=bot.welcome_buttons,
        welcome_message_thread_id=bot.welcome_message_thread_id,
        join_captcha_enabled=bot.join_captcha_enabled,
        captcha_mode=getattr(bot, 'captcha_mode', CaptchaMode.DISABLED),        
        captcha_timeout_seconds=getattr(bot, 'captcha_timeout_seconds', 10),    
    )


@router.put("/{bot_id}/welcome", response_model=WelcomeSettingsResponse)        
async def update_welcome_settings(
        bot_id: int,
        data: WelcomeSettingsUpdate,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Обновить настройки приветствия"""
    bot = await service.update_welcome_settings(bot_id, data, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    return WelcomeSettingsResponse(
        welcome_enabled=bot.welcome_enabled,
        welcome_message=bot.welcome_message,
        welcome_media_url=bot.welcome_media_url,
        welcome_media_type=bot.welcome_media_type,
        welcome_buttons=bot.welcome_buttons,
        welcome_message_thread_id=bot.welcome_message_thread_id,
        join_captcha_enabled=bot.join_captcha_enabled,
        captcha_mode=getattr(bot, 'captcha_mode', CaptchaMode.DISABLED),        
        captcha_timeout_seconds=getattr(bot, 'captcha_timeout_seconds', 10),    
    )

@router.get("/{bot_id}/auto-approval", response_model=AutoApprovalResponse)     
async def get_auto_approval_settings(
        bot_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить настройки автоодобрения"""        
    bot = await service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    return AutoApprovalResponse(
        auto_approval_mode=bot.auto_approval_mode,
        approval_criteria=bot.approval_criteria
    )


@router.put("/{bot_id}/auto-approval", response_model=AutoApprovalResponse)     
async def update_auto_approval_settings(
        bot_id: int,
        data: AutoApprovalUpdate,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Обновить настройки автоодобрения"""        
    try:
        bot = await service.update_auto_approval(bot_id, data, owner_id=current_user.id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")        

        return AutoApprovalResponse(
            auto_approval_mode=bot.auto_approval_mode,
            approval_criteria=bot.approval_criteria
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
