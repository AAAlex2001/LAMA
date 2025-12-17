"""
Роуты для работы с ботами
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.bot.bots import BotService
from backend.services.bot.commands import BotCommandService
from backend.services.bot.auto_reply import AutoReplyService
from backend.services.bot.triggers import TriggerService
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
    AutoReplyCreate,
    AutoReplyUpdate,
    AutoReplyResponse,
    AutoReplyListResponse,
    BotStatsResponse,
    TriggerCreate,
    TriggerUpdate,
    TriggerResponse,
    TriggerListResponse,
)
from backend.models.bots import TriggerType
from backend.models.bots import BotStatus

router = APIRouter(prefix="/bots", tags=["Bots"])


# ============================================================================
# Dependency
# ============================================================================

async def get_bot_service(db: AsyncSession = Depends(get_db)):
    """Получить сервис ботов"""
    return BotService(db)


async def get_command_service(db: AsyncSession = Depends(get_db)):
    """Получить сервис команд"""
    return BotCommandService(db)


async def get_auto_reply_service(db: AsyncSession = Depends(get_db)):
    """Получить сервис автоответов"""
    return AutoReplyService(db)


async def get_trigger_service(db: AsyncSession = Depends(get_db)):
    """Получить сервис триггеров"""
    return TriggerService(db)


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

    from backend.models.bots import CaptchaMode
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

    from backend.models.bots import CaptchaMode
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
        bot_service: BotService = Depends(get_bot_service),
        command_service: BotCommandService = Depends(get_command_service),
        current_user: User = Depends(get_current_user)
):
    """Создать команду для бота"""
    # Проверяем существование бота
    bot = await bot_service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    try:
        command = await command_service.create_command(bot_id, data, owner_id=current_user.id)
        return command
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create command: {str(e)}")


@router.get("/{bot_id}/commands", response_model=BotCommandListResponse)
async def get_commands(
        bot_id: int,
        is_active: Optional[bool] = None,
        bot_service: BotService = Depends(get_bot_service),
        command_service: BotCommandService = Depends(get_command_service),
        current_user: User = Depends(get_current_user)
):
    """Получить список команд бота"""
    bot = await bot_service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    commands, total = await command_service.get_commands(bot_id, is_active, owner_id=current_user.id)

    return BotCommandListResponse(
        items=commands,
        total=total
    )


@router.get("/{bot_id}/commands/{command_id}", response_model=BotCommandResponse)
async def get_command(
        bot_id: int,
        command_id: int,
        command_service: BotCommandService = Depends(get_command_service),
        current_user: User = Depends(get_current_user)
):
    """Получить команду по ID"""
    command = await command_service.get_command(command_id, owner_id=current_user.id)
    if not command or command.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Command not found")
    return command


@router.put("/{bot_id}/commands/{command_id}", response_model=BotCommandResponse)
async def update_command(
        bot_id: int,
        command_id: int,
        data: BotCommandUpdate,
        command_service: BotCommandService = Depends(get_command_service),
        current_user: User = Depends(get_current_user)
):
    """Обновить команду"""
    command = await command_service.get_command(command_id, owner_id=current_user.id)
    if not command or command.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Command not found")

    updated_command = await command_service.update_command(command_id, data, owner_id=current_user.id)
    if not updated_command:
        raise HTTPException(status_code=404, detail="Command not found")
    return updated_command


@router.delete("/{bot_id}/commands/{command_id}", status_code=204)
async def delete_command(
        bot_id: int,
        command_id: int,
        command_service: BotCommandService = Depends(get_command_service),
        current_user: User = Depends(get_current_user)
):
    """Удалить команду"""
    command = await command_service.get_command(command_id, owner_id=current_user.id)
    if not command or command.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Command not found")

    success = await command_service.delete_command(command_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Command not found")


# ============================================================================
# Auto Replies
# ============================================================================

@router.post("/{bot_id}/auto-replies", response_model=AutoReplyResponse, status_code=201)
async def create_auto_reply(
        bot_id: int,
        data: AutoReplyCreate,
        bot_service: BotService = Depends(get_bot_service),
        auto_reply_service: AutoReplyService = Depends(get_auto_reply_service),
        current_user: User = Depends(get_current_user)
):
    """Создать автоответ на ключевые слова"""
    bot = await bot_service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    try:
        auto_reply = await auto_reply_service.create_auto_reply(bot_id, data, owner_id=current_user.id)
        return auto_reply
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{bot_id}/auto-replies", response_model=AutoReplyListResponse)
async def get_auto_replies(
        bot_id: int,
        is_active: Optional[bool] = None,
        bot_service: BotService = Depends(get_bot_service),
        auto_reply_service: AutoReplyService = Depends(get_auto_reply_service),
        current_user: User = Depends(get_current_user)
):
    """Получить список автоответов бота"""
    bot = await bot_service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    auto_replies, total = await auto_reply_service.get_auto_replies(bot_id, is_active, owner_id=current_user.id)

    return AutoReplyListResponse(
        items=auto_replies,
        total=total
    )


@router.get("/{bot_id}/auto-replies/{auto_reply_id}", response_model=AutoReplyResponse)
async def get_auto_reply(
        bot_id: int,
        auto_reply_id: int,
        auto_reply_service: AutoReplyService = Depends(get_auto_reply_service),
        current_user: User = Depends(get_current_user)
):
    """Получить автоответ по ID"""
    auto_reply = await auto_reply_service.get_auto_reply(auto_reply_id, owner_id=current_user.id)
    if not auto_reply or auto_reply.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Auto reply not found")
    return auto_reply


@router.put("/{bot_id}/auto-replies/{auto_reply_id}", response_model=AutoReplyResponse)
async def update_auto_reply(
        bot_id: int,
        auto_reply_id: int,
        data: AutoReplyUpdate,
        auto_reply_service: AutoReplyService = Depends(get_auto_reply_service),
        current_user: User = Depends(get_current_user)
):
    """Обновить автоответ"""
    auto_reply = await auto_reply_service.get_auto_reply(auto_reply_id, owner_id=current_user.id)
    if not auto_reply or auto_reply.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Auto reply not found")

    updated_auto_reply = await auto_reply_service.update_auto_reply(auto_reply_id, data, owner_id=current_user.id)
    if not updated_auto_reply:
        raise HTTPException(status_code=404, detail="Auto reply not found")
    return updated_auto_reply


@router.delete("/{bot_id}/auto-replies/{auto_reply_id}", status_code=204)
async def delete_auto_reply(
        bot_id: int,
        auto_reply_id: int,
        auto_reply_service: AutoReplyService = Depends(get_auto_reply_service),
        current_user: User = Depends(get_current_user)
):
    """Удалить автоответ"""
    auto_reply = await auto_reply_service.get_auto_reply(auto_reply_id, owner_id=current_user.id)
    if not auto_reply or auto_reply.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Auto reply not found")

    success = await auto_reply_service.delete_auto_reply(auto_reply_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Auto reply not found")


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


# ============================================================================
# Triggers
# ============================================================================

@router.post("/{bot_id}/triggers", response_model=TriggerResponse, status_code=201)
async def create_trigger(
        bot_id: int,
        data: TriggerCreate,
        bot_service: BotService = Depends(get_bot_service),
        trigger_service: TriggerService = Depends(get_trigger_service),
        current_user: User = Depends(get_current_user)
):
    """Создать триггер для бота"""
    bot = await bot_service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    try:
        trigger = await trigger_service.create_trigger(
            bot_id=bot_id,
            name=data.name,
            trigger_type=data.trigger_type,
            action_type=data.action_type,
            action_data=data.action_data,
            delay_minutes=data.delay_minutes,
            delivery_window=data.delivery_window,
            filters=data.filters,
            is_active=data.is_active,
            owner_id=current_user.id,
        )
        return trigger
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{bot_id}/triggers", response_model=TriggerListResponse)
async def get_triggers(
        bot_id: int,
        trigger_type: Optional[TriggerType] = None,
        is_active: Optional[bool] = None,
        bot_service: BotService = Depends(get_bot_service),
        trigger_service: TriggerService = Depends(get_trigger_service),
        current_user: User = Depends(get_current_user)
):
    """Получить список триггеров бота"""
    bot = await bot_service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    triggers, total = await trigger_service.get_triggers(
        bot_id=bot_id,
        trigger_type=trigger_type,
        is_active=is_active,
        owner_id=current_user.id,
    )

    return TriggerListResponse(items=triggers, total=total)


@router.get("/{bot_id}/triggers/{trigger_id}", response_model=TriggerResponse)
async def get_trigger(
        bot_id: int,
        trigger_id: int,
        trigger_service: TriggerService = Depends(get_trigger_service),
        current_user: User = Depends(get_current_user)
):
    """Получить триггер по ID"""
    trigger = await trigger_service.get_trigger(trigger_id, owner_id=current_user.id)
    if not trigger or trigger.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Trigger not found")
    return trigger


@router.put("/{bot_id}/triggers/{trigger_id}", response_model=TriggerResponse)
async def update_trigger(
        bot_id: int,
        trigger_id: int,
        data: TriggerUpdate,
        trigger_service: TriggerService = Depends(get_trigger_service),
        current_user: User = Depends(get_current_user)
):
    """Обновить триггер"""
    trigger = await trigger_service.get_trigger(trigger_id, owner_id=current_user.id)
    if not trigger or trigger.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Trigger not found")

    updated = await trigger_service.update_trigger(
        trigger_id=trigger_id,
        owner_id=current_user.id,
        name=data.name,
        trigger_type=data.trigger_type,
        action_type=data.action_type,
        action_data=data.action_data,
        delay_minutes=data.delay_minutes,
        delivery_window=data.delivery_window,
        filters=data.filters,
        is_active=data.is_active,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Trigger not found")
    return updated


@router.delete("/{bot_id}/triggers/{trigger_id}", status_code=204)
async def delete_trigger(
        bot_id: int,
        trigger_id: int,
        trigger_service: TriggerService = Depends(get_trigger_service),
        current_user: User = Depends(get_current_user)
):
    """Удалить триггер"""
    trigger = await trigger_service.get_trigger(trigger_id, owner_id=current_user.id)
    if not trigger or trigger.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Trigger not found")

    success = await trigger_service.delete_trigger(trigger_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Trigger not found")
