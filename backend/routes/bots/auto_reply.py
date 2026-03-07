from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots import AutoReplyCreate, AutoReplyUpdate, AutoReplyResponse, AutoReplyListResponse
from backend.services.bot.bot_crud import BotCrudService
from backend.services.bot.bot_auto_reply import BotAutoReplyService
from backend.routes.bots.dependencies import get_bot_service, get_auto_reply_service

router = APIRouter()


@router.post("/{bot_id}/auto-replies", response_model=AutoReplyResponse, status_code=201)
async def create_auto_reply(
    bot_id: int,
    data: AutoReplyCreate,
    bot_service: BotCrudService = Depends(get_bot_service),
    auto_reply_service: BotAutoReplyService = Depends(get_auto_reply_service),
    current_user: User = Depends(get_current_user),
):
    """Создать автоответ на ключевые слова."""
    bot = await bot_service.get(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    try:
        return await auto_reply_service.create(bot_id, data, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{bot_id}/auto-replies", response_model=AutoReplyListResponse)
async def get_auto_replies(
    bot_id: int,
    is_active: Optional[bool] = None,
    bot_service: BotCrudService = Depends(get_bot_service),
    auto_reply_service: BotAutoReplyService = Depends(get_auto_reply_service),
    current_user: User = Depends(get_current_user),
):
    """Получить список автоответов бота."""
    bot = await bot_service.get(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    replies, total = await auto_reply_service.get_list(bot_id, is_active, owner_id=current_user.id)
    return AutoReplyListResponse(items=replies, total=total)


@router.get("/{bot_id}/auto-replies/{auto_reply_id}", response_model=AutoReplyResponse)
async def get_auto_reply(
    bot_id: int,
    auto_reply_id: int,
    auto_reply_service: BotAutoReplyService = Depends(get_auto_reply_service),
    current_user: User = Depends(get_current_user),
):
    """Получить автоответ по ID."""
    reply = await auto_reply_service.get(auto_reply_id, owner_id=current_user.id)
    if not reply or reply.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Auto reply not found")
    return reply


@router.put("/{bot_id}/auto-replies/{auto_reply_id}", response_model=AutoReplyResponse)
async def update_auto_reply(
    bot_id: int,
    auto_reply_id: int,
    data: AutoReplyUpdate,
    auto_reply_service: BotAutoReplyService = Depends(get_auto_reply_service),
    current_user: User = Depends(get_current_user),
):
    """Обновить автоответ."""
    reply = await auto_reply_service.get(auto_reply_id, owner_id=current_user.id)
    if not reply or reply.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Auto reply not found")
    updated = await auto_reply_service.update(auto_reply_id, data, owner_id=current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Auto reply not found")
    return updated


@router.delete("/{bot_id}/auto-replies/{auto_reply_id}", status_code=204)
async def delete_auto_reply(
    bot_id: int,
    auto_reply_id: int,
    auto_reply_service: BotAutoReplyService = Depends(get_auto_reply_service),
    current_user: User = Depends(get_current_user),
):
    """Удалить автоответ."""
    reply = await auto_reply_service.get(auto_reply_id, owner_id=current_user.id)
    if not reply or reply.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Auto reply not found")
    if not await auto_reply_service.delete(auto_reply_id, owner_id=current_user.id):
        raise HTTPException(status_code=404, detail="Auto reply not found")
