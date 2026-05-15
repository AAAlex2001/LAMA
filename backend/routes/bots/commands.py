from typing import Optional

from fastapi import APIRouter, Depends, Path, Query
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


@router.post(
    "/{bot_id}/commands",
    response_model=BotCommandResponse,
    status_code=201,
    summary="Создать команду для бота",
)
async def create_command(
    data: BotCommandCreate,
    bot_id: int = Path(..., description="ID бота."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateCommand(db).execute(bot_id, data, owner_id=current_user.id)


@router.get(
    "/{bot_id}/commands",
    response_model=BotCommandListResponse,
    summary="Список команд бота",
)
async def get_commands(
    bot_id: int = Path(..., description="ID бота."),
    channel_id: Optional[int] = Query(
        None,
        description="Фильтр: команды, привязанные к конкретному каналу.",
    ),
    is_active: Optional[bool] = Query(
        None,
        description="Только активные (true) или только неактивные (false).",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    commands, total = await ListCommands(db).execute(
        bot_id, channel_id=channel_id, is_active=is_active, owner_id=current_user.id,
    )
    return BotCommandListResponse(items=commands, total=total)


@router.get(
    "/{bot_id}/commands/{command_id}",
    response_model=BotCommandResponse,
    summary="Получить команду по id",
)
async def get_command(
    bot_id: int = Path(..., description="ID бота."),
    command_id: int = Path(..., description="ID команды."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_command_or_404(db, command_id, owner_id=current_user.id, bot_id=bot_id)


@router.put(
    "/{bot_id}/commands/{command_id}",
    response_model=BotCommandResponse,
    summary="Обновить команду",
)
async def update_command(
    data: BotCommandUpdate,
    bot_id: int = Path(..., description="ID бота."),
    command_id: int = Path(..., description="ID команды."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateCommand(db).execute(
        command_id, data, owner_id=current_user.id, bot_id=bot_id,
    )


@router.delete(
    "/{bot_id}/commands/{command_id}",
    status_code=204,
    summary="Удалить команду",
)
async def delete_command(
    bot_id: int = Path(..., description="ID бота."),
    command_id: int = Path(..., description="ID команды."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteCommand(db).execute(command_id, owner_id=current_user.id, bot_id=bot_id)
