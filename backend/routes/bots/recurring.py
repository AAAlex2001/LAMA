from fastapi import APIRouter, Depends, Query

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots import (
    RecurringMessageCreate, RecurringMessageUpdate,
    RecurringMessageResponse, RecurringMessageListResponse,
)
from backend.services.bot.bot_recurring import BotRecurringService
from backend.routes.bots.dependencies import get_recurring_message_service

router = APIRouter()


@router.get("/{bot_id}/recurring", response_model=RecurringMessageListResponse)
async def list_recurring_messages(
    bot_id: int,
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    service: BotRecurringService = Depends(get_recurring_message_service),
    current_user: User = Depends(get_current_user),
):
    """Список повторяющихся сообщений бота."""
    items, total = await service.list(bot_id, current_user.id, skip, limit)
    return RecurringMessageListResponse(items=items, total=total)


@router.post("/{bot_id}/recurring", response_model=RecurringMessageResponse)
async def create_recurring_message(
    bot_id: int,
    data: RecurringMessageCreate,
    service: BotRecurringService = Depends(get_recurring_message_service),
    current_user: User = Depends(get_current_user),
):
    """Создать повторяющееся сообщение."""

    return await service.create(bot_id, data, current_user.id)


@router.get("/{bot_id}/recurring/{message_id}",
            response_model=RecurringMessageResponse)
async def get_recurring_message(
    bot_id: int,
    message_id: int,
    service: BotRecurringService = Depends(get_recurring_message_service),
    current_user: User = Depends(get_current_user),
):
    """Получить повторяющееся сообщение."""
    msg = await service.get(message_id, current_user.id)
    return msg


@router.patch("/{bot_id}/recurring/{message_id}",
              response_model=RecurringMessageResponse)
async def update_recurring_message(
    bot_id: int,
    message_id: int,
    data: RecurringMessageUpdate,
    service: BotRecurringService = Depends(get_recurring_message_service),
    current_user: User = Depends(get_current_user),
):
    """Обновить повторяющееся сообщение."""
    msg = await service.get(message_id, current_user.id)

    return await service.update(message_id, data, current_user.id)


@router.delete("/{bot_id}/recurring/{message_id}", status_code=204)
async def delete_recurring_message(
    bot_id: int,
    message_id: int,
    service: BotRecurringService = Depends(get_recurring_message_service),
    current_user: User = Depends(get_current_user),
):
    """Удалить повторяющееся сообщение."""
    msg = await service.get(message_id, current_user.id)
    await service.delete(message_id, current_user.id)
