from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots import AutoReplyCreate, AutoReplyUpdate, AutoReplyResponse, AutoReplyListResponse
from backend.routes.bots.dependencies import get_create_auto_reply, get_delete_auto_reply, get_list_auto_replies, get_update_auto_reply
from backend.services.bot.features.auto_replies.create_auto_reply import CreateAutoReply
from backend.services.bot.features.auto_replies.delete_auto_reply import DeleteAutoReply
from backend.services.bot.features.auto_replies.list_auto_replies import ListAutoReplies
from backend.services.bot.features.auto_replies.lookup import find_auto_reply_or_404
from backend.services.bot.features.auto_replies.update_auto_reply import UpdateAutoReply

router = APIRouter()


@router.post("/{bot_id}/auto-replies",
             response_model=AutoReplyResponse, status_code=201)
async def create_auto_reply(
    bot_id: int,
    data: AutoReplyCreate,
    create_auto_reply_use_case: CreateAutoReply = Depends(get_create_auto_reply),
    current_user: User = Depends(get_current_user),
):
    """Создать автоответ на ключевые слова."""
    channel_id = data.channel_id
    return await create_auto_reply_use_case.execute(bot_id, data, owner_id=current_user.id, channel_id=channel_id)


@router.get("/{bot_id}/auto-replies", response_model=AutoReplyListResponse)
async def get_auto_replies(
    bot_id: int,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    search: Optional[str] = Query(None, max_length=255),
    channel_id: Optional[int] = Query(None),
    list_auto_replies: ListAutoReplies = Depends(get_list_auto_replies),
    current_user: User = Depends(get_current_user),
):
    """Получить список автоответов бота с пагинацией и поиском по ключевым словам."""
    replies, total = await list_auto_replies.execute(
        bot_id, is_active, owner_id=current_user.id,
        skip=skip, limit=limit, search=search, channel_id=channel_id,
    )
    return AutoReplyListResponse(items=replies, total=total)


@router.get("/{bot_id}/auto-replies/{auto_reply_id}",
            response_model=AutoReplyResponse)
async def get_auto_reply(
    bot_id: int,
    auto_reply_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить автоответ по ID."""
    return await find_auto_reply_or_404(db, auto_reply_id, owner_id=current_user.id)


@router.put("/{bot_id}/auto-replies/{auto_reply_id}",
            response_model=AutoReplyResponse)
async def update_auto_reply(
    bot_id: int,
    auto_reply_id: int,
    data: AutoReplyUpdate,
    update_auto_reply_use_case: UpdateAutoReply = Depends(get_update_auto_reply),
    current_user: User = Depends(get_current_user),
):
    """Обновить автоответ."""
    return await update_auto_reply_use_case.execute(auto_reply_id, data, owner_id=current_user.id)


@router.delete("/{bot_id}/auto-replies/{auto_reply_id}", status_code=204)
async def delete_auto_reply(
    bot_id: int,
    auto_reply_id: int,
    delete_auto_reply_use_case: DeleteAutoReply = Depends(get_delete_auto_reply),
    current_user: User = Depends(get_current_user),
):
    """Удалить автоответ."""
    await delete_auto_reply_use_case.execute(auto_reply_id, owner_id=current_user.id)
