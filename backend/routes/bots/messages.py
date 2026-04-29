from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots import SendMessageRequest, BotMessageListResponse
from backend.routes.bots.dependencies import get_broadcast_to_chats, get_list_bot_messages, get_send_bot_message
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.messaging.broadcast import BroadcastToChats
from backend.services.bot.features.messaging.list_messages import ListBotMessages
from backend.services.bot.features.messaging.send_message import SendBotMessage

router = APIRouter()

@router.post('/{bot_id}/messages', status_code=201)
async def send_message(
    bot_id: int,
    data: SendMessageRequest,
    send_bot_message: SendBotMessage = Depends(get_send_bot_message),
    broadcast_to_chats: BroadcastToChats = Depends(get_broadcast_to_chats),
    list_messages: ListBotMessages = Depends(get_list_bot_messages),
    current_user: User = Depends(get_current_user),
):
    if data.chat_id is None:
        return await broadcast_to_chats.execute(bot_id, data, owner_id=current_user.id)
    await send_bot_message.execute(bot_id, data, owner_id=current_user.id)
    messages, _ = await list_messages.execute(
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
    list_messages: ListBotMessages = Depends(get_list_bot_messages),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await find_bot_or_404(db, bot_id, owner_id=current_user.id)
    skip = (page - 1) * page_size
    messages, total = await list_messages.execute(
        bot_id=bot_id, chat_id=chat_id, is_incoming=is_incoming,
        skip=skip, limit=page_size,
    )
    return BotMessageListResponse(
        items=messages, total=total, page=page, page_size=page_size,
    )
