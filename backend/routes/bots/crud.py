from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.models.bots import BotStatus
from backend.schemas.bots import (
    BotCreate, BotUpdate, BotResponse, BotListResponse,
    SyncBotRequest, SyncBotResponse, BotStatsResponse,
)
from backend.services.bot.bot_crud import BotCrudService
from backend.services.bot.bot_messaging import BotMessagingService
from backend.routes.bots.dependencies import get_bot_service, get_bot_messaging_service

router = APIRouter()


@router.post("/sync", response_model=SyncBotResponse)
async def sync_bot(
    data: SyncBotRequest,
    service: BotCrudService = Depends(get_bot_service),
    current_user: User = Depends(get_current_user),
):
    """Синхронизировать бота через Telegram API."""
    try:
        bot = await service.sync_from_telegram(data.token, owner_id=current_user.id)
        return SyncBotResponse(success=True, bot=bot, message="Bot synchronized successfully")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {e}")


@router.get("/", response_model=BotListResponse)
async def get_bots(
    status: Optional[BotStatus] = None,
    page: int = 1,
    page_size: int = 50,
    service: BotCrudService = Depends(get_bot_service),
    current_user: User = Depends(get_current_user),
):
    """Получить список ботов."""
    skip = (page - 1) * page_size
    bots, total = await service.get_list(owner_id=current_user.id, status=status, skip=skip, limit=page_size)
    pages = (total + page_size - 1) // page_size
    return BotListResponse(items=bots, total=total, page=page, page_size=page_size, pages=pages)


@router.post("/", response_model=BotResponse, status_code=201)
async def create_bot(
    data: BotCreate,
    service: BotCrudService = Depends(get_bot_service),
    current_user: User = Depends(get_current_user),
):
    """Создать бота по токену."""
    try:
        return await service.create(data, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create bot: {e}")


@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
    bot_id: int,
    service: BotCrudService = Depends(get_bot_service),
    current_user: User = Depends(get_current_user),
):
    """Получить бота по ID."""
    bot = await service.get(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


@router.put("/{bot_id}", response_model=BotResponse)
async def update_bot(
    bot_id: int,
    data: BotUpdate,
    service: BotCrudService = Depends(get_bot_service),
    current_user: User = Depends(get_current_user),
):
    """Обновить бота."""
    try:
        bot = await service.update(bot_id, data, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


@router.delete("/{bot_id}", status_code=204)
async def delete_bot(
    bot_id: int,
    service: BotCrudService = Depends(get_bot_service),
    current_user: User = Depends(get_current_user),
):
    """Удалить бота."""
    if not await service.delete(bot_id, owner_id=current_user.id):
        raise HTTPException(status_code=404, detail="Bot not found")


@router.post("/{bot_id}/deactivate", response_model=BotResponse)
async def deactivate_bot(
    bot_id: int,
    service: BotCrudService = Depends(get_bot_service),
    current_user: User = Depends(get_current_user),
):
    """Деактивировать бота: снять вебхук, остановить обработку."""
    bot = await service.deactivate(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


@router.post("/{bot_id}/activate", response_model=BotResponse)
async def activate_bot(
    bot_id: int,
    service: BotCrudService = Depends(get_bot_service),
    current_user: User = Depends(get_current_user),
):
    """Активировать бота: установить вебхук, возобновить обработку."""
    try:
        bot = await service.activate(bot_id, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


@router.post("/{bot_id}/sync", response_model=BotResponse)
async def sync_existing_bot(
    bot_id: int,
    service: BotCrudService = Depends(get_bot_service),
    current_user: User = Depends(get_current_user),
):
    """Обновить информацию существующего бота через Telegram API."""
    bot = await service.get(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    try:
        return await service.sync_from_telegram(bot.token, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {e}")


@router.get("/{bot_id}/stats", response_model=BotStatsResponse)
async def get_bot_stats(
    bot_id: int,
    service: BotCrudService = Depends(get_bot_service),
    messaging: BotMessagingService = Depends(get_bot_messaging_service),
    current_user: User = Depends(get_current_user),
):
    """Получить статистику бота."""
    bot = await service.get(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    stats = await messaging.get_stats(bot_id, owner_id=current_user.id)
    return BotStatsResponse(**stats)
