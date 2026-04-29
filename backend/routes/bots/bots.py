from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
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


@router.post("/sync", response_model=SyncBotResponse)
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


@router.get("/", response_model=BotListResponse)
async def get_bots(
    status: Optional[BotStatus] = None,
    page: int = 1,
    page_size: int = 50,
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


@router.post("/", response_model=BotResponse, status_code=201)
async def create_bot(
    data: BotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateBot(db).execute(data, owner_id=current_user.id)


@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_bot_or_404(db, bot_id, owner_id=current_user.id)


@router.put("/{bot_id}", response_model=BotResponse)
async def update_bot(
    bot_id: int,
    data: BotUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateBot(db).execute(bot_id, data, owner_id=current_user.id)


@router.delete("/{bot_id}", status_code=204)
async def delete_bot(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteBot(db).execute(bot_id, owner_id=current_user.id)


@router.post("/{bot_id}/deactivate", response_model=BotResponse)
async def deactivate_bot(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DeactivateBot(db).execute(bot_id, owner_id=current_user.id)


@router.post("/{bot_id}/activate", response_model=BotResponse)
async def activate_bot(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ActivateBot(db).execute(bot_id, owner_id=current_user.id)


@router.post("/{bot_id}/sync", response_model=BotResponse)
async def sync_existing_bot(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = await find_bot_or_404(db, bot_id, owner_id=current_user.id)
    return await SyncBotFromTelegram(db).execute(bot.token, owner_id=current_user.id)


@router.post("/{bot_id}/telegram-photo", response_model=BotResponse, status_code=200)
async def upload_bot_photo(
    bot_id: int,
    photo: UploadFile = File(...),
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


@router.delete("/{bot_id}/telegram-photo", response_model=BotResponse)
async def delete_bot_photo(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DeleteBotPhoto(db).execute(bot_id=bot_id, owner_id=current_user.id)


@router.get("/{bot_id}/stats", response_model=BotStatsResponse)
async def get_bot_stats(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stats = await GetBotStats(db).execute(bot_id, owner_id=current_user.id)
    return BotStatsResponse(**stats)
