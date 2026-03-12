from typing import Optional
from fastapi import APIRouter, Depends

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.models.bots import TriggerType
from backend.schemas.bots import TriggerCreate, TriggerUpdate, TriggerResponse, TriggerListResponse
from backend.services.bot.bot_crud import BotCrudService
from backend.services.bot.bot_triggers import BotTriggerService
from backend.routes.bots.dependencies import get_bot_service, get_trigger_service

router = APIRouter()


@router.post("/{bot_id}/triggers",
             response_model=TriggerResponse, status_code=201)
async def create_trigger(
    bot_id: int,
    data: TriggerCreate,
    bot_service: BotCrudService = Depends(get_bot_service),
    trigger_service: BotTriggerService = Depends(get_trigger_service),
    current_user: User = Depends(get_current_user),
):
    """Создать триггер для бота."""
    bot = await bot_service.get(bot_id, owner_id=current_user.id)
    return await trigger_service.create(
        bot_id=bot_id, name=data.name,
        trigger_type=data.trigger_type, action_type=data.action_type,
        action_data=data.action_data, delay_minutes=data.delay_minutes,
        delivery_window=data.delivery_window, chat_type=data.chat_type,
        is_active=data.is_active, owner_id=current_user.id,
    )


@router.get("/{bot_id}/triggers", response_model=TriggerListResponse)
async def get_triggers(
    bot_id: int,
    trigger_type: Optional[TriggerType] = None,
    is_active: Optional[bool] = None,
    bot_service: BotCrudService = Depends(get_bot_service),
    trigger_service: BotTriggerService = Depends(get_trigger_service),
    current_user: User = Depends(get_current_user),
):
    """Получить список триггеров бота."""
    bot = await bot_service.get(bot_id, owner_id=current_user.id)
    triggers, total = await trigger_service.get_list(
        bot_id=bot_id, trigger_type=trigger_type, is_active=is_active, owner_id=current_user.id,
    )
    return TriggerListResponse(items=triggers, total=total)


@router.get("/{bot_id}/triggers/{trigger_id}", response_model=TriggerResponse)
async def get_trigger(
    bot_id: int,
    trigger_id: int,
    trigger_service: BotTriggerService = Depends(get_trigger_service),
    current_user: User = Depends(get_current_user),
):
    """Получить триггер по ID."""
    trigger = await trigger_service.get(trigger_id, owner_id=current_user.id)
    return trigger


@router.put("/{bot_id}/triggers/{trigger_id}", response_model=TriggerResponse)
async def update_trigger(
    bot_id: int,
    trigger_id: int,
    data: TriggerUpdate,
    trigger_service: BotTriggerService = Depends(get_trigger_service),
    current_user: User = Depends(get_current_user),
):
    """Обновить триггер."""
    trigger = await trigger_service.get(trigger_id, owner_id=current_user.id)
    updated = await trigger_service.update(
        trigger_id=trigger_id, owner_id=current_user.id,
        name=data.name, trigger_type=data.trigger_type,
        action_type=data.action_type, action_data=data.action_data,
        delay_minutes=data.delay_minutes, delivery_window=data.delivery_window,
        filters=data.filters, is_active=data.is_active,
    )
    return updated


@router.delete("/{bot_id}/triggers/{trigger_id}", status_code=204)
async def delete_trigger(
    bot_id: int,
    trigger_id: int,
    trigger_service: BotTriggerService = Depends(get_trigger_service),
    current_user: User = Depends(get_current_user),
):
    """Удалить триггер."""
    trigger = await trigger_service.get(trigger_id, owner_id=current_user.id)
