"""Поиск автоответа + scope-фильтр по типу чата."""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import AutoReply, Bot as BotModel


async def find_auto_reply_or_404(
    db: AsyncSession,
    auto_reply_id: int,
    owner_id: Optional[int] = None,
    bot_id: Optional[int] = None,
) -> AutoReply:
    """Автоответ по ID; с проверкой владельца если передан. 404 иначе."""
    query = select(AutoReply).where(AutoReply.id == auto_reply_id)
    if bot_id is not None:
        query = query.where(AutoReply.bot_id == bot_id)
    if owner_id is not None:
        query = query.join(BotModel, AutoReply.bot_id == BotModel.id).where(
            BotModel.owner_id == owner_id,
        )
    auto_reply = (await db.execute(query)).scalar_one_or_none()
    if not auto_reply:
        raise HTTPException(status_code=404, detail="Auto-reply not found")
    return auto_reply


def apply_scope_filter(query, chat_type: Optional[str]):
    """Фильтр по AutoReply.scope в зависимости от типа чата."""
    if not chat_type:
        return query
    if chat_type == "private":
        return query.where(
            (AutoReply.scope == "PRIVATE")
            | (AutoReply.scope == "ALL")
            | (AutoReply.scope.is_(None))
        )
    if chat_type in ("group", "supergroup"):
        return query.where(
            (AutoReply.scope == "GROUPS")
            | (AutoReply.scope == "ALL")
            | (AutoReply.scope.is_(None))
        )
    return query
