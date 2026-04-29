from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.models.bots import BotStatus
from backend.schemas.bots import (
    BotCreate, BotUpdate, BotResponse, BotListResponse,
    SyncBotRequest, SyncBotResponse, BotStatsResponse,
)
from backend.routes.bots.dependencies import (
    get_activate_bot,
    get_bot_stats_use_case,
    get_create_bot,
    get_deactivate_bot,
    get_delete_bot,
    get_delete_bot_photo,
    get_list_bots,
    get_sync_bot_from_telegram,
    get_update_bot,
    get_upload_bot_photo,
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


@router.post("/sync", response_model=SyncBotResponse)
async def sync_bot(
    data: SyncBotRequest,
    sync_bot_from_telegram: SyncBotFromTelegram = Depends(get_sync_bot_from_telegram),
    current_user: User = Depends(get_current_user),
):
    """Синхронизировать бота через Telegram API."""

    bot = await sync_bot_from_telegram.execute(data.token, owner_id=current_user.id, description=data.description)
    return SyncBotResponse(success=True, bot=bot,
                           message="Bot synchronized successfully")


@router.get("/", response_model=BotListResponse)
async def get_bots(
    status: Optional[BotStatus] = None,
    page: int = 1,
    page_size: int = 50,
    list_bots: ListBots = Depends(get_list_bots),
    current_user: User = Depends(get_current_user),
):
    """Получить список ботов."""
    skip = (page - 1) * page_size
    bots, total = await list_bots.execute(owner_id=current_user.id, status=status, skip=skip, limit=page_size)
    pages = (total + page_size - 1) // page_size
    return BotListResponse(items=bots, total=total,
                           page=page, page_size=page_size, pages=pages)


@router.post("/", response_model=BotResponse, status_code=201)
async def create_bot(
    data: BotCreate,
    create_bot_use_case: CreateBot = Depends(get_create_bot),
    current_user: User = Depends(get_current_user),
):
    """Создать бота по токену."""

    return await create_bot_use_case.execute(data, owner_id=current_user.id)


@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить бота по ID."""
    return await find_bot_or_404(db, bot_id, owner_id=current_user.id)


@router.put("/{bot_id}", response_model=BotResponse)
async def update_bot(
    bot_id: int,
    data: BotUpdate,
    update_bot_use_case: UpdateBot = Depends(get_update_bot),
    current_user: User = Depends(get_current_user),
):
    """Обновить бота."""
    return await update_bot_use_case.execute(bot_id, data, owner_id=current_user.id)


@router.delete("/{bot_id}", status_code=204)
async def delete_bot(
    bot_id: int,
    delete_bot_use_case: DeleteBot = Depends(get_delete_bot),
    current_user: User = Depends(get_current_user),
):
    """Удалить бота."""
    await delete_bot_use_case.execute(bot_id, owner_id=current_user.id)


@router.post("/{bot_id}/deactivate", response_model=BotResponse)
async def deactivate_bot(
    bot_id: int,
    deactivate_bot_use_case: DeactivateBot = Depends(get_deactivate_bot),
    current_user: User = Depends(get_current_user),
):
    """Деактивировать бота: снять вебхук, остановить обработку."""
    return await deactivate_bot_use_case.execute(bot_id, owner_id=current_user.id)


@router.post("/{bot_id}/activate", response_model=BotResponse)
async def activate_bot(
    bot_id: int,
    activate_bot_use_case: ActivateBot = Depends(get_activate_bot),
    current_user: User = Depends(get_current_user),
):
    """Активировать бота: установить вебхук, возобновить обработку."""
    return await activate_bot_use_case.execute(bot_id, owner_id=current_user.id)


@router.post("/{bot_id}/sync", response_model=BotResponse)
async def sync_existing_bot(
    bot_id: int,
    sync_bot_from_telegram: SyncBotFromTelegram = Depends(get_sync_bot_from_telegram),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить информацию существующего бота через Telegram API."""
    bot = await find_bot_or_404(db, bot_id, owner_id=current_user.id)
    return await sync_bot_from_telegram.execute(bot.token, owner_id=current_user.id)


@router.post("/{bot_id}/telegram-photo", response_model=BotResponse, status_code=200)
async def upload_bot_photo(
    bot_id: int,
    photo: UploadFile = File(...),
    upload_photo: UploadBotPhoto = Depends(get_upload_bot_photo),
    current_user: User = Depends(get_current_user),
):
    """Загрузить фото профиля бота."""
    data = await photo.read()
    return await upload_photo.execute(
        bot_id=bot_id,
        owner_id=current_user.id,
        data=data,
        filename=photo.filename or "photo.jpg",
    )


@router.delete("/{bot_id}/telegram-photo", response_model=BotResponse)
async def delete_bot_photo(
    bot_id: int,
    delete_photo: DeleteBotPhoto = Depends(get_delete_bot_photo),
    current_user: User = Depends(get_current_user),
):
    """Удалить фото профиля бота."""
    return await delete_photo.execute(bot_id=bot_id, owner_id=current_user.id)


@router.get("/{bot_id}/stats", response_model=BotStatsResponse)
async def get_bot_stats(
    bot_id: int,
    get_stats: GetBotStats = Depends(get_bot_stats_use_case),
    current_user: User = Depends(get_current_user),
):
    """Получить статистику бота."""
    stats = await get_stats.execute(bot_id, owner_id=current_user.id)
    return BotStatsResponse(**stats)
