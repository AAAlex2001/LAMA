from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots import (
    AutoReplyCreate,
    AutoReplyUpdate,
    AutoReplyResponse,
    AutoReplyListResponse,
)
from backend.services.bot.bot_service import BotService
from backend.services.bot.auto_reply import AutoReplyService
from backend.routes.bots.dependencies import get_bot_service, get_auto_reply_service

router = APIRouter()

@router.post("/{bot_id}/auto-replies", response_model=AutoReplyResponse, status_code=201)                                                                       
async def create_auto_reply(
        bot_id: int,
        data: AutoReplyCreate,
        bot_service: BotService = Depends(get_bot_service),
        auto_reply_service: AutoReplyService = Depends(get_auto_reply_service), 
        current_user: User = Depends(get_current_user)
):
    """Создать автоответ на ключевые слова"""    
    bot = await bot_service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    try:
        auto_reply = await auto_reply_service.create_auto_reply(bot_id, data, owner_id=current_user.id)
        return auto_reply
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{bot_id}/auto-replies", response_model=AutoReplyListResponse)     
async def get_auto_replies(
        bot_id: int,
        is_active: Optional[bool] = None,
        bot_service: BotService = Depends(get_bot_service),
        auto_reply_service: AutoReplyService = Depends(get_auto_reply_service), 
        current_user: User = Depends(get_current_user)
):
    """Получить список автоответов бота"""
    bot = await bot_service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    auto_replies, total = await auto_reply_service.get_auto_replies(bot_id, is_active, owner_id=current_user.id)                                                
    return AutoReplyListResponse(
        items=auto_replies,
        total=total
    )


@router.get("/{bot_id}/auto-replies/{auto_reply_id}", response_model=AutoReplyResponse)
async def get_auto_reply(
        bot_id: int,
        auto_reply_id: int,
        auto_reply_service: AutoReplyService = Depends(get_auto_reply_service), 
        current_user: User = Depends(get_current_user)
):
    """Получить автоответ по ID"""
    auto_reply = await auto_reply_service.get_auto_reply(auto_reply_id, owner_id=current_user.id)
    if not auto_reply or auto_reply.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Auto reply not found")     
    return auto_reply


@router.put("/{bot_id}/auto-replies/{auto_reply_id}", response_model=AutoReplyResponse)
async def update_auto_reply(
        bot_id: int,
        auto_reply_id: int,
        data: AutoReplyUpdate,
        auto_reply_service: AutoReplyService = Depends(get_auto_reply_service), 
        current_user: User = Depends(get_current_user)
):
    """Обновить автоответ"""
    auto_reply = await auto_reply_service.get_auto_reply(auto_reply_id, owner_id=current_user.id)
    if not auto_reply or auto_reply.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Auto reply not found")     

    updated_auto_reply = await auto_reply_service.update_auto_reply(auto_reply_id, data, owner_id=current_user.id)
    if not updated_auto_reply:
        raise HTTPException(status_code=404, detail="Auto reply not found")     
    return updated_auto_reply


@router.delete("/{bot_id}/auto-replies/{auto_reply_id}", status_code=204)       
async def delete_auto_reply(
        bot_id: int,
        auto_reply_id: int,
        auto_reply_service: AutoReplyService = Depends(get_auto_reply_service), 
        current_user: User = Depends(get_current_user)
):
    """Удалить автоответ"""
    auto_reply = await auto_reply_service.get_auto_reply(auto_reply_id, owner_id=current_user.id)
    if not auto_reply or auto_reply.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Auto reply not found")     

    success = await auto_reply_service.delete_auto_reply(auto_reply_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Auto reply not found")
