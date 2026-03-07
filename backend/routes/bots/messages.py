from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots import (
    SendMessageRequest,
    BotMessageResponse,
    BotMessageListResponse,
)
from backend.services.bot.bot_service import BotService
from backend.routes.bots.dependencies import get_bot_service

router = APIRouter()

@router.post("/{bot_id}/messages", response_model=BotMessageResponse, status_code=201)
async def send_message(
        bot_id: int,
        data: SendMessageRequest,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Отправить сообщение от имени бота"""        
    try:
        message = await service.send_message(bot_id, data, owner_id=current_user.id)
        # Получаем сохранённое сообщение из БД  
        messages, _ = await service.get_messages(
            bot_id=bot_id,
            chat_id=data.chat_id,
            is_incoming=False,
            skip=0,
            limit=1
        )

        if messages:
            return messages[0]

        raise HTTPException(status_code=500, detail="Message sent but not saved")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")                                                                        

@router.get("/{bot_id}/messages", response_model=BotMessageListResponse)        
async def get_messages(
        bot_id: int,
        chat_id: Optional[int] = None,
        is_incoming: Optional[bool] = None,
        page: int = 1,
        page_size: int = 50,
        service: BotService = Depends(get_bot_service),
        current_user: User = Depends(get_current_user)
):
    """Получить список сообщений бота"""
    bot = await service.get_bot(bot_id, owner_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    skip = (page - 1) * page_size
    messages, total = await service.get_messages(
        bot_id=bot_id,
        chat_id=chat_id,
        is_incoming=is_incoming,
        skip=skip,
        limit=page_size
    )

    pages = (total + page_size - 1) // page_size

    return BotMessageListResponse(
        items=messages,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )
