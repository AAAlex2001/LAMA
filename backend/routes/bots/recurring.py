from fastapi import APIRouter, Depends, HTTPException, Query

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots import (
    RecurringMessageCreate,
    RecurringMessageUpdate,
    RecurringMessageResponse,
    RecurringMessageListResponse,
)
from backend.services.bot.recurring_messages import RecurringMessageService
from backend.routes.bots.dependencies import get_recurring_message_service

router = APIRouter()

@router.get("/{bot_id}/recurring", response_model=RecurringMessageListResponse) 
async def list_recurring_messages(
        bot_id: int,
        skip: int = 0,
        limit: int = Query(default=100, le=100),
        service: RecurringMessageService = Depends(get_recurring_message_service),      
        current_user: User = Depends(get_current_user)
):
    """Список повторяющихся сообщений бота"""   
    try:
        items, total = await service.list(bot_id, current_user.id, skip, limit) 
        return RecurringMessageListResponse(
            items=items,
            total=total
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{bot_id}/recurring", response_model=RecurringMessageResponse)    
async def create_recurring_message(
        bot_id: int,
        data: RecurringMessageCreate,
        service: RecurringMessageService = Depends(get_recurring_message_service),      
        current_user: User = Depends(get_current_user)
):
    """Создать повторяющееся сообщение"""
    try:
        return await service.create(bot_id, data, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{bot_id}/recurring/{message_id}", response_model=RecurringMessageResponse)
async def get_recurring_message(
        bot_id: int,
        message_id: int,
        service: RecurringMessageService = Depends(get_recurring_message_service),      
        current_user: User = Depends(get_current_user)
):
    """Получить повторяющееся сообщение"""        
    msg = await service.get(message_id, current_user.id)
    if not msg or msg.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Message not found")        
    return msg


@router.patch("/{bot_id}/recurring/{message_id}", response_model=RecurringMessageResponse)
async def update_recurring_message(
        bot_id: int,
        message_id: int,
        data: RecurringMessageUpdate,
        service: RecurringMessageService = Depends(get_recurring_message_service),      
        current_user: User = Depends(get_current_user)
):
    """Обновить повторяющееся сообщение"""        
    msg = await service.get(message_id, current_user.id)
    if not msg or msg.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Message not found")        

    try:
        return await service.update(message_id, data, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{bot_id}/recurring/{message_id}", status_code=204)
async def delete_recurring_message(
        bot_id: int,
        message_id: int,
        service: RecurringMessageService = Depends(get_recurring_message_service),      
        current_user: User = Depends(get_current_user)
):
    """Удалить повторяющееся сообщение"""
    msg = await service.get(message_id, current_user.id)
    if not msg or msg.bot_id != bot_id:
        raise HTTPException(status_code=404, detail="Message not found")        

    try:
        await service.delete(message_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
