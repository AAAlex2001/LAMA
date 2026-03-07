from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.direct.chat import DirectChatListResponse, DirectChatUpdate, DirectChatResponse
from backend.services.direct.chat_service import DirectChatService

router = APIRouter(prefix="/chats", tags=["Direct / Chats"])

def get_direct_chat_service(db: AsyncSession = Depends(get_db)) -> DirectChatService:
    return DirectChatService(db)

@router.get("", response_model=DirectChatListResponse)
async def get_chats(
    bot_id: Optional[int] = Query(None, description="Фильтр по боту"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    chat_service: DirectChatService = Depends(get_direct_chat_service)
):
    """История чатов."""
    chats, total = await chat_service.get_chats_for_user(
        owner_id=current_user.id,
        skip=skip,
        limit=limit,
        bot_id=bot_id
    )
    return {
        "items": chats,
        "total": total,
        "page": (skip // limit) + 1,
        "page_size": limit
    }

@router.patch("/{chat_id}", response_model=DirectChatResponse)
async def update_chat(
    chat_id: int,
    data: DirectChatUpdate,
    current_user: User = Depends(get_current_user),
    chat_service: DirectChatService = Depends(get_direct_chat_service)
):
    """Обновление статуса чата."""
    chat = await chat_service.update_chat_status(chat_id, current_user.id, data)
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден или нет доступа")
    
    return chat
