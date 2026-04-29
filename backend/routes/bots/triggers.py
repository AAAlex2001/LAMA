from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.models.bots import TriggerType
from backend.schemas.bots.triggers import (
    TriggerCreate,
    TriggerListResponse,
    TriggerResponse,
    TriggerUpdate,
)
from backend.services.bot.features.triggers.crud.create_trigger import CreateTrigger
from backend.services.bot.features.triggers.crud.delete_trigger import DeleteTrigger
from backend.services.bot.features.triggers.crud.list_triggers import ListTriggers
from backend.services.bot.features.triggers.crud.update_trigger import UpdateTrigger
from backend.services.bot.features.triggers.lookup import find_trigger_or_404

router = APIRouter()


@router.post("/{bot_id}/triggers",
             response_model=TriggerResponse, status_code=201)
async def create_trigger(
    bot_id: int,
    data: TriggerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать триггер для бота."""
    return await CreateTrigger(db).execute(
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить список триггеров бота."""
    triggers, total = await ListTriggers(db).execute(
        bot_id=bot_id, trigger_type=trigger_type, is_active=is_active, owner_id=current_user.id,
    )
    return TriggerListResponse(items=triggers, total=total)


@router.get("/{bot_id}/triggers/{trigger_id}", response_model=TriggerResponse)
async def get_trigger(
    bot_id: int,
    trigger_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить триггер по ID."""
    return await find_trigger_or_404(db, trigger_id, owner_id=current_user.id, bot_id=bot_id)


@router.put("/{bot_id}/triggers/{trigger_id}", response_model=TriggerResponse)
async def update_trigger(
    bot_id: int,
    trigger_id: int,
    data: TriggerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить триггер."""
    return await UpdateTrigger(db).execute(
        trigger_id=trigger_id, owner_id=current_user.id,
        bot_id=bot_id,
        name=data.name, trigger_type=data.trigger_type,
        action_type=data.action_type, action_data=data.action_data,
        delay_minutes=data.delay_minutes, delivery_window=data.delivery_window,
        filters=data.filters, is_active=data.is_active,
    )


@router.delete("/{bot_id}/triggers/{trigger_id}", status_code=204)
async def delete_trigger(
    bot_id: int,
    trigger_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить триггер."""
    await DeleteTrigger(db).execute(trigger_id, owner_id=current_user.id, bot_id=bot_id)
