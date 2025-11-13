"""
Роуты для работы с ботами
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.bot.bots import BotService
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots import (
    BotCreate,
    BotUpdate,
    BotResponse,
    BotListResponse,
    SyncBotRequest,
    SyncBotResponse,
    WelcomeSettingsUpdate,
    WelcomeSettingsResponse,
    AutoApprovalUpdate,
    AutoApprovalResponse,
    SendMessageRequest,
    BotMessageResponse,
    BotMessageListResponse,
    BotCommandCreate,
    BotCommandUpdate,
    BotCommandResponse,
    BotCommandListResponse,
    BotStatsResponse
)
from backend.models.bots import BotStatus

router = APIRouter(prefix="/bots", tags=["Bots"])


# ============================================================================
# Dependency
# ============================================================================

async def get_bot_service(db: AsyncSession = Depends(get_db)):
    """Получить сервис ботов"""
    return BotService(db)


# ============================================================================
# Статические маршруты (должны быть ПЕРЕД динамическими)
# ============================================================================

@router.post("/sync", response_model=SyncBotResponse)
async def sync_bot(
        data: SyncBotRequest,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Синхронизировать бота через Telegram API"""
    try:
        bot = await service.sync_bot_from_telegram(data.token, owner_id=current_user.id)
        return SyncBotResponse(
            success=True,
            bot=bot,
            message="Bot synchronized successfully"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("", response_model=BotListResponse)
async def get_bots(
        status: Optional[BotStatus] = None,
        page: int = 1,
        page_size: int = 50,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить список ботов"""
    skip = (page - 1) * page_size
    bots, total = await service.get_bots(
        owner_id=current_user.id,
        status=status,
        skip=skip,
        limit=page_size
    )

    pages = (total + page_size - 1) // page_size

    return BotListResponse(
        items=bots,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.post("", response_model=BotResponse, status_code=201)
async def create_bot(
        data: BotCreate,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Создать бота по токену"""
    try:
        bot = await service.create_bot(data, owner_id=current_user.id)
        return bot
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create bot: {str(e)}")


# ============================================================================
# Динамические маршруты (с {bot_id})
# ============================================================================

@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
        bot_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить бота по ID"""
    bot = await service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


@router.put("/{bot_id}", response_model=BotResponse)
async def update_bot(
        bot_id: int,
        data: BotUpdate,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Обновить бота"""
    try:
        bot = await service.update_bot(bot_id, data, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


@router.delete("/{bot_id}", status_code=204)
async def delete_bot(
        bot_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Удалить бота"""
    success = await service.delete_bot(bot_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Bot not found")


@router.post("/{bot_id}/sync", response_model=BotResponse)
async def sync_existing_bot(
        bot_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Обновить информацию существующего бота через Telegram API"""
    bot = await service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    try:
        updated_bot = await service.sync_bot_from_telegram(bot.token, owner_id=current_user.id)
        return updated_bot
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


# ============================================================================
# Настройки приветствия
# ============================================================================

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
        welcome_buttons=bot.welcome_buttons
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
        welcome_buttons=bot.welcome_buttons
    )


# ============================================================================
# Настройки автоодобрения
# ============================================================================

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


# ============================================================================
# Сообщения
# ============================================================================

@router.post("/{bot_id}/messages", response_model=BotMessageResponse, status_code=201)
async def send_message(
        bot_id: int,
        data: SendMessageRequest,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Отправить сообщение от имени бота"""
    try:
        message = await service.send_message(bot_id, data, owner_id=current_user.id)

        # Получаем сохранённое сообщение из БД
        messages, _ = await service.get_messages(
            bot_id=bot_id,
            chat_id=data.chat_id,
            is_incoming=False,
            skip=0,
            limit=1
        )

        if messages:
            return messages[0]

        raise HTTPException(status_code=500, detail="Message sent but not saved")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")


@router.get("/{bot_id}/messages", response_model=BotMessageListResponse)
async def get_messages(
        bot_id: int,
        chat_id: Optional[int] = None,
        is_incoming: Optional[bool] = None,
        page: int = 1,
        page_size: int = 50,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить список сообщений бота"""
    bot = await service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    skip = (page - 1) * page_size
    messages, total = await service.get_messages(
        bot_id=bot_id,
        chat_id=chat_id,
        is_incoming=is_incoming,
        skip=skip,
        limit=page_size
    )

    pages = (total + page_size - 1) // page_size

    return BotMessageListResponse(
        items=messages,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


# ============================================================================
# Команды
# ============================================================================

@router.post("/{bot_id}/commands", response_model=BotCommandResponse, status_code=201)
async def create_command(
        bot_id: int,
        data: BotCommandCreate,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Создать команду для бота"""
    try:
        command = await service.create_command(bot_id, data, owner_id=current_user.id)
        return command
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create command: {str(e)}")


@router.get("/{bot_id}/commands", response_model=BotCommandListResponse)
async def get_commands(
        bot_id: int,
        is_active: Optional[bool] = None,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить список команд бота"""
    bot = await service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    commands, total = await service.get_commands(bot_id, is_active, owner_id=current_user.id)

    return BotCommandListResponse(
        items=commands,
        total=total
    )


@router.get("/{bot_id}/commands/{command_id}", response_model=BotCommandResponse)
async def get_command(
        bot_id: int,
        command_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить команду по ID"""
    command = await service.get_command(command_id, owner_id=current_user.id)
    if not command or command.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Command not found")
    return command


@router.put("/{bot_id}/commands/{command_id}", response_model=BotCommandResponse)
async def update_command(
        bot_id: int,
        command_id: int,
        data: BotCommandUpdate,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Обновить команду"""
    command = await service.get_command(command_id, owner_id=current_user.id)
    if not command or command.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Command not found")

    updated_command = await service.update_command(command_id, data, owner_id=current_user.id)
    return updated_command


@router.delete("/{bot_id}/commands/{command_id}", status_code=204)
async def delete_command(
        bot_id: int,
        command_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Удалить команду"""
    command = await service.get_command(command_id, owner_id=current_user.id)
    if not command or command.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Command not found")

    success = await service.delete_command(command_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Command not found")


# ============================================================================
# Статистика
# ============================================================================

@router.get("/{bot_id}/stats", response_model=BotStatsResponse)
async def get_bot_stats(
        bot_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить статистику бота"""
    bot = await service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    stats = await service.get_bot_stats(bot_id, owner_id=current_user.id)
    return BotStatsResponse(**stats)
