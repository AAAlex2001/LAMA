from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.models.bots import BotStatus
from backend.schemas.bots import (
    BotCreate,
    BotUpdate,
    BotResponse,
    BotListResponse,
    SyncBotRequest,
    SyncBotResponse,
    BotStatsResponse,
)
from backend.services.bot.bot_service import BotService
from backend.routes.bots.dependencies import get_bot_service

router = APIRouter()

@router.post("/sync", response_model=SyncBotResponse)
async def sync_bot(
        data: SyncBotRequest,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Синхронизировать бота через Telegram API"""     
    try:
        bot = await service.sync_bot_from_telegram(data.token, owner_id=current_user.id)
        return SyncBotResponse(
            success=True,
            bot=bot,
            message="Bot synchronized successfully"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")   


@router.get("/", response_model=BotListResponse)
async def get_bots(
        status: Optional[BotStatus] = None,
        page: int = 1,
        page_size: int = 50,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить список ботов"""
    skip = (page - 1) * page_size
    bots, total = await service.get_bots(
        owner_id=current_user.id,
        status=status,
        skip=skip,
        limit=page_size
    )

    pages = (total + page_size - 1) // page_size

    return BotListResponse(
        items=bots,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.post("/", response_model=BotResponse, status_code=201)
async def create_bot(
        data: BotCreate,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Создать бота по токену"""
    try:
        bot = await service.create_bot(data, owner_id=current_user.id)
        return bot
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create bot: {str(e)}")                                                                          

@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
        bot_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить бота по ID"""
    bot = await service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


@router.put("/{bot_id}", response_model=BotResponse)
async def update_bot(
        bot_id: int,
        data: BotUpdate,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Обновить бота"""
    try:
        bot = await service.update_bot(bot_id, data, owner_id=current_user.id)  
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


@router.delete("/{bot_id}", status_code=204)
async def delete_bot(
        bot_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Удалить бота"""
    success = await service.delete_bot(bot_id, owner_id=current_user.id)        
    if not success:
        raise HTTPException(status_code=404, detail="Bot not found")


@router.post("/{bot_id}/sync", response_model=BotResponse)
async def sync_existing_bot(
        bot_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Обновить информацию существующего бота через Telegram API"""
    bot = await service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    try:
        updated_bot = await service.sync_bot_from_telegram(bot.token, owner_id=current_user.id)
        return updated_bot
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")   

@router.get("/{bot_id}/stats", response_model=BotStatsResponse)
async def get_bot_stats(
        bot_id: int,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить статистику бота"""
    bot = await service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    stats = await service.get_bot_stats(bot_id, owner_id=current_user.id)       
    return BotStatsResponse(**stats)
