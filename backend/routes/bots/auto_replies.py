from typing import Optional
from fastapi import APIRouter, Depends, Query
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


@router.post("/{bot_id}/auto-replies", response_model=AutoReplyResponse, status_code=201)
async def create_auto_reply(
    bot_id: int,
    data: AutoReplyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel_id = data.channel_id
    return await CreateAutoReply(db).execute(
        bot_id, data, owner_id=current_user.id, channel_id=channel_id
    )


@router.get("/{bot_id}/auto-replies", response_model=AutoReplyListResponse)
async def list_auto_replies(
    bot_id: int,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    search: Optional[str] = Query(None, max_length=255),
    channel_id: Optional[int] = Query(None),
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


@router.get("/{bot_id}/auto-replies/{auto_reply_id}", response_model=AutoReplyResponse)
async def get_auto_reply(
    bot_id: int,
    auto_reply_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_auto_reply_or_404(
        db, auto_reply_id, owner_id=current_user.id, bot_id=bot_id
    )


@router.put("/{bot_id}/auto-replies/{auto_reply_id}", response_model=AutoReplyResponse)
async def update_auto_reply(
    bot_id: int,
    auto_reply_id: int,
    data: AutoReplyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateAutoReply(db).execute(
        auto_reply_id, data, owner_id=current_user.id, bot_id=bot_id
    )


@router.delete("/{bot_id}/auto-replies/{auto_reply_id}", status_code=204)
async def delete_auto_reply(
    bot_id: int,
    auto_reply_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteAutoReply(db).execute(auto_reply_id, owner_id=current_user.id, bot_id=bot_id)
