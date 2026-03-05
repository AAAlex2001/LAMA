from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.models.bots import TriggerType
from backend.schemas.bots import (
    TriggerCreate,
    TriggerUpdate,
    TriggerResponse,
    TriggerListResponse,
)
from backend.services.bot.bot_service import BotService
from backend.services.bot.triggers import TriggerService
from backend.routes.bots.dependencies import get_bot_service, get_trigger_service

router = APIRouter()

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
            chat_type=data.chat_type,
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

    return TriggerListResponse(
        items=triggers,
        total=total
    )


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
