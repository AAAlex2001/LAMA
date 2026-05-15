from typing import Optional

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots.messages import BotMessageListResponse, SendMessageRequest
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.messaging.broadcast import BroadcastToChats
from backend.services.bot.features.messaging.list_messages import ListBotMessages
from backend.services.bot.features.messaging.send_message import SendBotMessage

router = APIRouter()


@router.post(
    "/{bot_id}/messages",
    status_code=201,
    summary="Отправить сообщение от бота (в один чат либо broadcast всем подписчикам)",
)
async def send_message(
    data: SendMessageRequest,
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Если chat_id не задан — broadcast по всем DirectChat'ам бота."""
    if data.chat_id is None:
        return await BroadcastToChats(db).execute(bot_id, data, owner_id=current_user.id)
    await SendBotMessage(db).execute(bot_id, data, owner_id=current_user.id)
    messages, _ = await ListBotMessages(db).execute(
        bot_id=bot_id, chat_id=data.chat_id, is_incoming=False, skip=0, limit=1,
    )
    if messages:
        return messages[0]


@router.get(
    "/{bot_id}/messages",
    response_model=BotMessageListResponse,
    summary="Лог сообщений бота с фильтрами",
)
async def get_messages(
    bot_id: int = Path(..., description="ID бота."),
    chat_id: Optional[int] = Query(None, description="Только сообщения этого чата."),
    is_incoming: Optional[bool] = Query(
        None,
        description="Фильтр направления: true — входящие в бот, false — исходящие от бота.",
    ),
    page: int = Query(1, ge=1, description="Номер страницы."),
    page_size: int = Query(50, ge=1, le=200, description="Размер страницы."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await find_bot_or_404(db, bot_id, owner_id=current_user.id)
    skip = (page - 1) * page_size
    messages, total = await ListBotMessages(db).execute(
        bot_id=bot_id, chat_id=chat_id, is_incoming=is_incoming,
        skip=skip, limit=page_size,
    )
    return BotMessageListResponse(
        items=messages, total=total, page=page, page_size=page_size,
    )
