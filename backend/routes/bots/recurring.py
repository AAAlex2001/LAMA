from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots.recurring import (
    RecurringMessageCreate, RecurringMessageUpdate,
    RecurringMessageResponse, RecurringMessageListResponse,
)
from backend.services.bot.features.recurring.create_recurring import CreateRecurring
from backend.services.bot.features.recurring.delete_recurring import DeleteRecurring
from backend.services.bot.features.recurring.list_recurring import ListRecurring
from backend.services.bot.features.recurring.lookup import find_recurring_or_404
from backend.services.bot.features.recurring.update_recurring import UpdateRecurring

router = APIRouter()


@router.get(
    "/{bot_id}/recurring",
    response_model=RecurringMessageListResponse,
    summary="Список повторяющихся сообщений бота",
)
async def list_recurring_messages(
    bot_id: int = Path(..., description="ID бота."),
    skip: int = Query(0, ge=0, description="Сдвиг для пагинации."),
    limit: int = Query(100, ge=1, le=100, description="Размер страницы."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = await ListRecurring(db).execute(bot_id, current_user.id, skip, limit)
    return RecurringMessageListResponse(items=items, total=total)


@router.post(
    "/{bot_id}/recurring",
    response_model=RecurringMessageResponse,
    summary="Создать повторяющееся сообщение (расписание + cron-окно)",
)
async def create_recurring_message(
    data: RecurringMessageCreate,
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateRecurring(db).execute(bot_id, data, current_user.id)


@router.get(
    "/{bot_id}/recurring/{message_id}",
    response_model=RecurringMessageResponse,
    summary="Получить повторяющееся сообщение",
)
async def get_recurring_message(
    bot_id: int = Path(..., description="ID бота."),
    message_id: int = Path(..., description="ID повторяющегося сообщения."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_recurring_or_404(db, message_id, current_user.id, bot_id=bot_id)


@router.patch(
    "/{bot_id}/recurring/{message_id}",
    response_model=RecurringMessageResponse,
    summary="Обновить повторяющееся сообщение",
)
async def update_recurring_message(
    data: RecurringMessageUpdate,
    bot_id: int = Path(..., description="ID бота."),
    message_id: int = Path(..., description="ID повторяющегося сообщения."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateRecurring(db).execute(message_id, data, current_user.id, bot_id=bot_id)


@router.delete(
    "/{bot_id}/recurring/{message_id}",
    status_code=204,
    summary="Удалить повторяющееся сообщение",
)
async def delete_recurring_message(
    bot_id: int = Path(..., description="ID бота."),
    message_id: int = Path(..., description="ID повторяющегося сообщения."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteRecurring(db).execute(message_id, current_user.id, bot_id=bot_id)
