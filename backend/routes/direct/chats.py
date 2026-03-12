from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional

from backend.database import get_db
from backend.models.auth import User
from backend.models.bots import Bot
from backend.routes.auth import get_current_user
from backend.schemas.direct.chat import DirectChatListResponse, DirectChatUpdate, DirectChatResponse, DirectChatCreate
from backend.services.direct.chat_service import DirectChatService

router = APIRouter(prefix="/chats", tags=["Direct / Chats"])

def get_direct_chat_service(db: AsyncSession = Depends(get_db)) -> DirectChatService:
    return DirectChatService(db)

@router.post("", response_model=DirectChatResponse)
async def create_chat(
    data: DirectChatCreate,
    current_user: User = Depends(get_current_user),
    chat_service: DirectChatService = Depends(get_direct_chat_service)
):
    """Создание / получение чата вручную."""
    bot_check = await chat_service.db.execute(
        select(Bot.id).where(and_(Bot.id == data.bot_id, Bot.owner_id == current_user.id))
    )

    chat = await chat_service.get_or_create_chat(
        bot_id=data.bot_id,
        tg_chat_id=data.tg_chat_id,
        tg_user_id=data.tg_user_id,
        tg_username=data.tg_username,
        tg_first_name=data.tg_first_name,
        tg_last_name=data.tg_last_name
    )
    return chat

@router.get("", response_model=DirectChatListResponse)
async def get_chats(
    bot_id: Optional[int] = Query(None, description="Фильтр по боту"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    sort: str = Query("new", description="new — сначала новые | old — сначала старые"),
    unread: Optional[str] = Query(None, description="unread | read"),
    current_user: User = Depends(get_current_user),
    chat_service: DirectChatService = Depends(get_direct_chat_service)
):
    """История чатов с фильтрацией и сортировкой."""
    chats, total = await chat_service.get_chats_for_user(
        owner_id=current_user.id,
        skip=skip,
        limit=limit,
        bot_id=bot_id,
        sort=sort,
        unread_filter=unread,
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
    
    return chat
