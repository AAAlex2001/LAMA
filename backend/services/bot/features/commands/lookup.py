"""Command lookup helpers."""

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
