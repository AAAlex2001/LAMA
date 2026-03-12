from typing import Optional
from fastapi import APIRouter, Depends

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots import SendMessageRequest, BotMessageResponse, BotMessageListResponse
from backend.services.bot.bot_crud import BotCrudService
from backend.services.bot.bot_messaging import BotMessagingService
from backend.routes.bots.dependencies import get_bot_service, get_bot_messaging_service

router = APIRouter()

@router.post('/{bot_id}/messages', status_code=201)
async def send_message(
    bot_id: int,
    data: SendMessageRequest,
    messaging: BotMessagingService = Depends(get_bot_messaging_service),
    current_user: User = Depends(get_current_user),
):
    if data.chat_id is None:
        return await messaging.broadcast(bot_id, data, owner_id=current_user.id)
    await messaging.send(bot_id, data, owner_id=current_user.id)
    messages, _ = await messaging.get_list(
        bot_id=bot_id, chat_id=data.chat_id, is_incoming=False, skip=0, limit=1,
    )
    if messages:
        return messages[0]

@router.get('/{bot_id}/messages', response_model=BotMessageListResponse)
async def get_messages(
    bot_id: int,
    chat_id: Optional[int] = None,
    is_incoming: Optional[bool] = None,
    page: int = 1,
    page_size: int = 50,
    messaging: BotMessagingService = Depends(get_bot_messaging_service),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    messages, total = await messaging.get_list(
        bot_id=bot_id, chat_id=chat_id, is_incoming=is_incoming,
        skip=skip, limit=page_size, owner_id=current_user.id
    )
    return BotMessageListResponse(
        items=messages, total=total, page=page, page_size=page_size,
    )
