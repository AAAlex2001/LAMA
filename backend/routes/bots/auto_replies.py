from typing import Optional

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots.auto_replies import (
    AutoReplyCreate,
    AutoReplyListResponse,
    AutoReplyResponse,
    AutoReplyUpdate,
)
from backend.services.bot.features.auto_replies.create_auto_reply import CreateAutoReply
from backend.services.bot.features.auto_replies.delete_auto_reply import DeleteAutoReply
from backend.services.bot.features.auto_replies.list_auto_replies import ListAutoReplies
from backend.services.bot.features.auto_replies.lookup import find_auto_reply_or_404
from backend.services.bot.features.auto_replies.update_auto_reply import UpdateAutoReply

router = APIRouter()


@router.post(
    "/{bot_id}/auto-replies",
    response_model=AutoReplyResponse,
    status_code=201,
    summary="Создать авто-ответ бота (триггер по тексту → готовый ответ)",
)
async def create_auto_reply(
    data: AutoReplyCreate,
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateAutoReply(db).execute(
        bot_id, data, owner_id=current_user.id, channel_id=data.channel_id,
    )


@router.get(
    "/{bot_id}/auto-replies",
    response_model=AutoReplyListResponse,
    summary="Список авто-ответов бота с фильтрами",
)
async def list_auto_replies(
    bot_id: int = Path(..., description="ID бота."),
    is_active: Optional[bool] = Query(None, description="Только активные."),
    skip: int = Query(0, ge=0, description="Сдвиг для пагинации."),
    limit: int = Query(100, ge=1, le=200, description="Размер страницы."),
    search: Optional[str] = Query(
        None,
        max_length=255,
        description="Поиск по тексту триггера или ответа (ILIKE).",
    ),
    channel_id: Optional[int] = Query(
        None,
        description="Только авто-ответы привязанные к конкретному каналу.",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    replies, total = await ListAutoReplies(db).execute(
        bot_id,
        is_active,
        owner_id=current_user.id,
        skip=skip,
        limit=limit,
        search=search,
        channel_id=channel_id,
    )
    return AutoReplyListResponse(items=replies, total=total)


@router.get(
    "/{bot_id}/auto-replies/{auto_reply_id}",
    response_model=AutoReplyResponse,
    summary="Получить авто-ответ по id",
)
async def get_auto_reply(
    bot_id: int = Path(..., description="ID бота."),
    auto_reply_id: int = Path(..., description="ID авто-ответа."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_auto_reply_or_404(
        db, auto_reply_id, owner_id=current_user.id, bot_id=bot_id,
    )


@router.put(
    "/{bot_id}/auto-replies/{auto_reply_id}",
    response_model=AutoReplyResponse,
    summary="Обновить авто-ответ",
)
async def update_auto_reply(
    data: AutoReplyUpdate,
    bot_id: int = Path(..., description="ID бота."),
    auto_reply_id: int = Path(..., description="ID авто-ответа."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateAutoReply(db).execute(
        auto_reply_id, data, owner_id=current_user.id, bot_id=bot_id,
    )


@router.delete(
    "/{bot_id}/auto-replies/{auto_reply_id}",
    status_code=204,
    summary="Удалить авто-ответ",
)
async def delete_auto_reply(
    bot_id: int = Path(..., description="ID бота."),
    auto_reply_id: int = Path(..., description="ID авто-ответа."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteAutoReply(db).execute(auto_reply_id, owner_id=current_user.id, bot_id=bot_id)
