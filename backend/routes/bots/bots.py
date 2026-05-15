from typing import Optional

from fastapi import APIRouter, Depends, File, Path, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.models.bots import BotStatus
from backend.routes.auth import get_current_user
from backend.schemas.bots.bot import (
    BotCreate,
    BotListResponse,
    BotResponse,
    BotStatsResponse,
    BotUpdate,
    SyncBotRequest,
    SyncBotResponse,
)
from backend.services.bot.features.crud.activate_bot import ActivateBot
from backend.services.bot.features.crud.create_bot import CreateBot
from backend.services.bot.features.crud.deactivate_bot import DeactivateBot
from backend.services.bot.features.crud.delete_bot import DeleteBot
from backend.services.bot.features.crud.delete_photo import DeleteBotPhoto
from backend.services.bot.features.crud.list_bots import ListBots
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.crud.sync_from_telegram import SyncBotFromTelegram
from backend.services.bot.features.crud.update_bot import UpdateBot
from backend.services.bot.features.crud.upload_photo import UploadBotPhoto
from backend.services.bot.features.messaging.get_stats import GetBotStats

router = APIRouter()


@router.post(
    "/sync",
    response_model=SyncBotResponse,
    summary="Подтянуть нового бота по токену (с проверкой через TG getMe)",
)
async def sync_bot(
    data: SyncBotRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = await SyncBotFromTelegram(db).execute(
        data.token,
        owner_id=current_user.id,
        description=data.description,
    )
    return SyncBotResponse(success=True, bot=bot, message="Bot synchronized successfully")


@router.get(
    "/",
    response_model=BotListResponse,
    summary="Список ботов пользователя с фильтрами",
)
async def get_bots(
    status: Optional[BotStatus] = Query(
        None, description="Фильтр по статусу: ACTIVE / INACTIVE.",
    ),
    page: int = Query(1, ge=1, description="Номер страницы."),
    page_size: int = Query(50, ge=1, le=200, description="Размер страницы."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    bots, total = await ListBots(db).execute(
        owner_id=current_user.id,
        status=status,
        skip=skip,
        limit=page_size,
    )
    pages = (total + page_size - 1) // page_size
    return BotListResponse(items=bots, total=total, page=page, page_size=page_size, pages=pages)


@router.post(
    "/",
    response_model=BotResponse,
    status_code=201,
    summary="Зарегистрировать нового бота (поставит webhook)",
)
async def create_bot(
    data: BotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateBot(db).execute(data, owner_id=current_user.id)


@router.get(
    "/{bot_id}",
    response_model=BotResponse,
    summary="Получить бота по id",
)
async def get_bot(
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_bot_or_404(db, bot_id, owner_id=current_user.id)


@router.put(
    "/{bot_id}",
    response_model=BotResponse,
    summary="Обновить бота (имя/описание синхронятся в Telegram)",
)
async def update_bot(
    data: BotUpdate,
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateBot(db).execute(bot_id, data, owner_id=current_user.id)


@router.delete(
    "/{bot_id}",
    status_code=204,
    summary="Удалить бота (снимет webhook в Telegram)",
)
async def delete_bot(
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteBot(db).execute(bot_id, owner_id=current_user.id)


@router.post(
    "/{bot_id}/deactivate",
    response_model=BotResponse,
    summary="Деактивировать бота (не удалять, но перестать обрабатывать его события)",
)
async def deactivate_bot(
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DeactivateBot(db).execute(bot_id, owner_id=current_user.id)


@router.post(
    "/{bot_id}/activate",
    response_model=BotResponse,
    summary="Активировать бота обратно",
)
async def activate_bot(
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ActivateBot(db).execute(bot_id, owner_id=current_user.id)


@router.post(
    "/{bot_id}/sync",
    response_model=BotResponse,
    summary="Пересинхронизировать данные бота с Telegram",
)
async def sync_existing_bot(
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = await find_bot_or_404(db, bot_id, owner_id=current_user.id)
    return await SyncBotFromTelegram(db).execute(bot.token, owner_id=current_user.id)


@router.post(
    "/{bot_id}/telegram-photo",
    response_model=BotResponse,
    status_code=200,
    summary="Загрузить новое фото бота в Telegram",
)
async def upload_bot_photo(
    bot_id: int = Path(..., description="ID бота."),
    photo: UploadFile = File(..., description="Файл фото (jpg/png)."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await photo.read()
    return await UploadBotPhoto(db).execute(
        bot_id=bot_id,
        owner_id=current_user.id,
        data=data,
        filename=photo.filename or "photo.jpg",
    )


@router.delete(
    "/{bot_id}/telegram-photo",
    response_model=BotResponse,
    summary="Удалить фото бота в Telegram",
)
async def delete_bot_photo(
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DeleteBotPhoto(db).execute(bot_id=bot_id, owner_id=current_user.id)


@router.get(
    "/{bot_id}/stats",
    response_model=BotStatsResponse,
    summary="Статистика бота: сообщения, контакты, прирост",
)
async def get_bot_stats(
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stats = await GetBotStats(db).execute(bot_id, owner_id=current_user.id)
    return BotStatsResponse(**stats)
