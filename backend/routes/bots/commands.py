from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots.commands import (
    BotCommandCreate,
    BotCommandListResponse,
    BotCommandResponse,
    BotCommandUpdate,
)
from backend.services.bot.features.commands.create_command import CreateCommand
from backend.services.bot.features.commands.delete_command import DeleteCommand
from backend.services.bot.features.commands.list_commands import ListCommands
from backend.services.bot.features.commands.lookup import find_command_or_404
from backend.services.bot.features.commands.update_command import UpdateCommand

router = APIRouter()


@router.post("/{bot_id}/commands",
             response_model=BotCommandResponse, status_code=201)
async def create_command(
    bot_id: int,
    data: BotCommandCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать команду для бота."""
    return await CreateCommand(db).execute(bot_id, data, owner_id=current_user.id)


@router.get("/{bot_id}/commands", response_model=BotCommandListResponse)
async def get_commands(
    bot_id: int,
    channel_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить список команд бота."""
    commands, total = await ListCommands(db).execute(
        bot_id, channel_id=channel_id, is_active=is_active, owner_id=current_user.id
    )
    return BotCommandListResponse(items=commands, total=total)


@router.get("/{bot_id}/commands/{command_id}",
            response_model=BotCommandResponse)
async def get_command(
    bot_id: int,
    command_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить команду по ID."""
    return await find_command_or_404(db, command_id, owner_id=current_user.id, bot_id=bot_id)


@router.put("/{bot_id}/commands/{command_id}",
            response_model=BotCommandResponse)
async def update_command(
    bot_id: int,
    command_id: int,
    data: BotCommandUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить команду."""
    return await UpdateCommand(db).execute(
        command_id, data, owner_id=current_user.id, bot_id=bot_id
    )


@router.delete("/{bot_id}/commands/{command_id}", status_code=204)
async def delete_command(
    bot_id: int,
    command_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить команду."""
    await DeleteCommand(db).execute(command_id, owner_id=current_user.id, bot_id=bot_id)
