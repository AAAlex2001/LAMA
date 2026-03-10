from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.bots.messages import SendMessageRequest, BotMessageResponse, BotMessageBatchResponse
from backend.schemas.direct.message import EditMessageRequest, ChatHistoryResponse
from backend.services.direct.chat_service import DirectChatService
from backend.services.direct.message_service import DirectMessageService

router = APIRouter(prefix="", tags=["Direct / Messages"])

def get_chat_service(db: AsyncSession = Depends(get_db)) -> DirectChatService:
    return DirectChatService(db)

def get_message_service(db: AsyncSession = Depends(get_db)) -> DirectMessageService:
    return DirectMessageService(db)

@router.get("/chats/{bot_id}/{tg_chat_id}/messages", response_model=ChatHistoryResponse)
async def get_chat_messages(
    bot_id: int,
    tg_chat_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    around_message_id: Optional[int] = Query(None, description="Load messages around this ID"),
    current_user: User = Depends(get_current_user),
    chat_service: DirectChatService = Depends(get_chat_service),
):
    """История сообщений в чате. around_message_id загружает окно вокруг указанного сообщения."""
    messages, total = await chat_service.get_chat_messages(
        bot_id, tg_chat_id,
        owner_id=current_user.id,
        skip=skip, limit=limit,
        around_message_id=around_message_id,
    )

    await chat_service.reset_unread(bot_id, tg_chat_id, owner_id=current_user.id)

    return {
        "items": messages,
        "total": total,
        "page": (skip // limit) + 1,
        "page_size": limit,
        "has_more": (skip + limit) < total,
    }

@router.post("/chats/{bot_id}/{tg_chat_id}/messages", response_model=BotMessageBatchResponse)
async def send_message(
    bot_id: int,
    tg_chat_id: int,
    request: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    msg_service: DirectMessageService = Depends(get_message_service)
):
    """Отправка нового сообщения пользователю."""
    messages = await msg_service.send_message(bot_id, tg_chat_id, current_user.id, request)
    if not messages:
        raise HTTPException(status_code=400, detail="Не удалось отправить сообщение")
    return {"items": messages}

@router.patch("/messages/{message_id}", response_model=BotMessageResponse)
async def edit_message(
    message_id: int,
    request: EditMessageRequest,
    current_user: User = Depends(get_current_user),
    msg_service: DirectMessageService = Depends(get_message_service)
):
    """Редактирование исходящего сообщения."""
    msg = await msg_service.edit_message(message_id, current_user.id, request)
    if not msg:
        raise HTTPException(status_code=404, detail="Сообщение не найдено или недоступно для редактирования")
    return msg

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    msg_service: DirectMessageService = Depends(get_message_service)
):
    """Удаление исходящего сообщения."""
    success = await msg_service.delete_message(message_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Сообщение не найдено или недоступно для удаления")
    return {"status": "ok"}
