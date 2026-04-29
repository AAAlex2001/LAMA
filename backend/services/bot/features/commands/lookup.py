"""Поиск команды + scope-фильтр + проверка уникальности."""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotCommand


async def find_command_or_404(
    db: AsyncSession, command_id: int, owner_id: Optional[int] = None,
) -> BotCommand:
    """Команда по ID; с проверкой владельца если передан. 404 иначе."""
    query = select(BotCommand).where(BotCommand.id == command_id)
    if owner_id is not None:
        query = query.join(BotModel, BotCommand.bot_id == BotModel.id).where(
            BotModel.owner_id == owner_id,
        )
    command = (await db.execute(query)).scalar_one_or_none()
    if not command:
        raise HTTPException(status_code=404, detail="Command not found")
    return command


def apply_scope_filter(query, chat_type: Optional[str]):
    """Фильтр по BotCommand.scope в зависимости от типа чата."""
    if not chat_type:
        return query
    if chat_type == "private":
        return query.where(
            (BotCommand.scope == "PRIVATE")
            | (BotCommand.scope == "ALL")
            | (BotCommand.scope.is_(None))
        )
    if chat_type in ("group", "supergroup"):
        return query.where(
            (BotCommand.scope == "GROUPS")
            | (BotCommand.scope == "ALL")
            | (BotCommand.scope.is_(None))
        )
    return query


async def ensure_command_unique(
    db: AsyncSession, bot_id: int, command_text: str, channel_id: Optional[int],
) -> None:
    """400 если такая же команда уже существует для этого (bot, channel)."""
    if channel_id is None:
        scope_filter = BotCommand.channel_id.is_(None)
    else:
        scope_filter = BotCommand.channel_id == channel_id

    existing = (await db.execute(
        select(BotCommand).where(
            BotCommand.bot_id == bot_id,
            BotCommand.command == command_text,
            scope_filter,
        )
    )).scalar_one_or_none()

    if existing is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Command {command_text} already exists for this bot",
        )
