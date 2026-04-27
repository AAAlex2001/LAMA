from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.direct.chat import (
    DirectChatCreate,
    DirectChatListResponse,
    DirectChatResponse,
    DirectChatUpdate,
)
from backend.services.direct.features.chats.get_or_create_chat import GetOrCreateChat
from backend.services.direct.features.chats.list_chats import ListChats
from backend.services.direct.features.chats.update_chat_status import UpdateChatStatus

router = APIRouter(prefix="/chats", tags=["Direct / Chats"])


@router.post("", response_model=DirectChatResponse)
async def create_chat(
    data: DirectChatCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создание / получение чата вручную."""
    return await GetOrCreateChat(db).execute(
        bot_id=data.bot_id,
        tg_chat_id=data.tg_chat_id,
        tg_user_id=data.tg_user_id,
        tg_username=data.tg_username,
        tg_first_name=data.tg_first_name,
        tg_last_name=data.tg_last_name,
    )


@router.get("", response_model=DirectChatListResponse)
async def get_chats(
    bot_id: Optional[int] = Query(None, description="Фильтр по боту"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    sort: str = Query("new", description="new — сначала новые | old — сначала старые"),
    unread: Optional[str] = Query(None, description="unread | read"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """История чатов с фильтрацией и сортировкой."""
    chats, total = await ListChats(db).execute(
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
        "page_size": limit,
    }


@router.patch("/{chat_id}", response_model=DirectChatResponse)
async def update_chat(
    chat_id: int,
    data: DirectChatUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновление статуса чата."""
    return await UpdateChatStatus(db).execute(chat_id, current_user.id, data)
