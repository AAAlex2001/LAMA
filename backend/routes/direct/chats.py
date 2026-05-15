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


@router.post(
    "",
    response_model=DirectChatResponse,
    summary="Создать или получить DM-чат",
    description=(
        "Идемпотентно: один чат на пару (bot_id, tg_chat_id). "
        "Если чат уже есть — обновляет устаревшие поля профиля (username, имя) и возвращает существующий. "
        "В обычном flow чаты создаются автоматически из webhook'а (SavePrivateMessage); "
        "этот эндпоинт нужен для ручного добавления / тестов."
    ),
)
async def create_chat(
    data: DirectChatCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await GetOrCreateChat(db).execute(
        bot_id=data.bot_id,
        tg_chat_id=data.tg_chat_id,
        tg_user_id=data.tg_user_id,
        tg_username=data.tg_username,
        tg_first_name=data.tg_first_name,
        tg_last_name=data.tg_last_name,
    )


@router.get(
    "",
    response_model=DirectChatListResponse,
    summary="Список DM-чатов пользователя",
    description=(
        "Постранично с превью последнего сообщения и инфой о боте. "
        "Сортировка new/old по updated_at, закреплённые (is_pinned=true) всегда сверху. "
        "Фильтры: bot_id (только чаты этого бота), unread=unread|read (по непрочитанным)."
    ),
)
async def get_chats(
    bot_id: Optional[int] = Query(None, description="Фильтр по боту"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    sort: str = Query("new", description="new — сначала новые | old — сначала старые"),
    unread: Optional[str] = Query(None, description="unread | read"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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


@router.patch(
    "/{chat_id}",
    response_model=DirectChatResponse,
    summary="Обновить статус чата (pin / block)",
    description=(
        "Частичный апдейт: is_pinned, is_blocked, unread_count, либо поля профиля собеседника. "
        "После успешного UPDATE рассылает WS-событие chat_updated всем открытым клиентам пользователя."
    ),
)
async def update_chat(
    chat_id: int,
    data: DirectChatUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateChatStatus(db).execute(chat_id, current_user.id, data)
