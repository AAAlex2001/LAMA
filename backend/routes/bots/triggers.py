from typing import Optional

from fastapi import APIRouter, Depends, Path, Query
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


@router.post(
    "/{bot_id}/triggers",
    response_model=TriggerResponse,
    status_code=201,
    summary="Создать триггер бота (реакция на событие)",
)
async def create_trigger(
    data: TriggerCreate,
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateTrigger(db).execute(
        bot_id=bot_id, name=data.name,
        trigger_type=data.trigger_type, action_type=data.action_type,
        action_data=data.action_data, delay_minutes=data.delay_minutes,
        delivery_window=data.delivery_window, chat_type=data.chat_type,
        is_active=data.is_active, owner_id=current_user.id,
    )


@router.get(
    "/{bot_id}/triggers",
    response_model=TriggerListResponse,
    summary="Список триггеров бота с фильтрами",
)
async def get_triggers(
    bot_id: int = Path(..., description="ID бота."),
    trigger_type: Optional[TriggerType] = Query(
        None,
        description="Фильтр по типу триггера (NEW_MEMBER / MESSAGE / SCHEDULE и т.д.).",
    ),
    is_active: Optional[bool] = Query(None, description="Только активные."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    triggers, total = await ListTriggers(db).execute(
        bot_id=bot_id, trigger_type=trigger_type, is_active=is_active, owner_id=current_user.id,
    )
    return TriggerListResponse(items=triggers, total=total)


@router.get(
    "/{bot_id}/triggers/{trigger_id}",
    response_model=TriggerResponse,
    summary="Получить триггер по id",
)
async def get_trigger(
    bot_id: int = Path(..., description="ID бота."),
    trigger_id: int = Path(..., description="ID триггера."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_trigger_or_404(db, trigger_id, owner_id=current_user.id, bot_id=bot_id)


@router.put(
    "/{bot_id}/triggers/{trigger_id}",
    response_model=TriggerResponse,
    summary="Обновить триггер",
)
async def update_trigger(
    data: TriggerUpdate,
    bot_id: int = Path(..., description="ID бота."),
    trigger_id: int = Path(..., description="ID триггера."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateTrigger(db).execute(
        trigger_id=trigger_id, owner_id=current_user.id,
        bot_id=bot_id,
        name=data.name, trigger_type=data.trigger_type,
        action_type=data.action_type, action_data=data.action_data,
        delay_minutes=data.delay_minutes, delivery_window=data.delivery_window,
        filters=data.filters, is_active=data.is_active,
    )


@router.delete(
    "/{bot_id}/triggers/{trigger_id}",
    status_code=204,
    summary="Удалить триггер",
)
async def delete_trigger(
    bot_id: int = Path(..., description="ID бота."),
    trigger_id: int = Path(..., description="ID триггера."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteTrigger(db).execute(trigger_id, owner_id=current_user.id, bot_id=bot_id)
