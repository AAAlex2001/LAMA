from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots import (
    RecurringMessageCreate, RecurringMessageUpdate,
    RecurringMessageResponse, RecurringMessageListResponse,
)
from backend.routes.bots.dependencies import get_create_recurring, get_delete_recurring, get_list_recurring, get_update_recurring
from backend.services.bot.features.recurring.create_recurring import CreateRecurring
from backend.services.bot.features.recurring.delete_recurring import DeleteRecurring
from backend.services.bot.features.recurring.list_recurring import ListRecurring
from backend.services.bot.features.recurring.lookup import find_recurring_or_404
from backend.services.bot.features.recurring.update_recurring import UpdateRecurring

router = APIRouter()


@router.get("/{bot_id}/recurring", response_model=RecurringMessageListResponse)
async def list_recurring_messages(
    bot_id: int,
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    list_recurring: ListRecurring = Depends(get_list_recurring),
    current_user: User = Depends(get_current_user),
):
    """Список повторяющихся сообщений бота."""
    items, total = await list_recurring.execute(bot_id, current_user.id, skip, limit)
    return RecurringMessageListResponse(items=items, total=total)


@router.post("/{bot_id}/recurring", response_model=RecurringMessageResponse)
async def create_recurring_message(
    bot_id: int,
    data: RecurringMessageCreate,
    create_recurring: CreateRecurring = Depends(get_create_recurring),
    current_user: User = Depends(get_current_user),
):
    """Создать повторяющееся сообщение."""

    return await create_recurring.execute(bot_id, data, current_user.id)


@router.get("/{bot_id}/recurring/{message_id}",
            response_model=RecurringMessageResponse)
async def get_recurring_message(
    bot_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить повторяющееся сообщение."""
    return await find_recurring_or_404(db, message_id, current_user.id)


@router.patch("/{bot_id}/recurring/{message_id}",
              response_model=RecurringMessageResponse)
async def update_recurring_message(
    bot_id: int,
    message_id: int,
    data: RecurringMessageUpdate,
    update_recurring: UpdateRecurring = Depends(get_update_recurring),
    current_user: User = Depends(get_current_user),
):
    """Обновить повторяющееся сообщение."""
    return await update_recurring.execute(message_id, data, current_user.id)


@router.delete("/{bot_id}/recurring/{message_id}", status_code=204)
async def delete_recurring_message(
    bot_id: int,
    message_id: int,
    delete_recurring: DeleteRecurring = Depends(get_delete_recurring),
    current_user: User = Depends(get_current_user),
):
    """Удалить повторяющееся сообщение."""
    await delete_recurring.execute(message_id, current_user.id)
