from typing import Optional
from fastapi import APIRouter, Depends

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.bots import BotCommandCreate, BotCommandUpdate, BotCommandResponse, BotCommandListResponse
from backend.services.bot.bot_crud import BotCrudService
from backend.services.bot.bot_commands import BotCommandService
from backend.routes.bots.dependencies import get_bot_service, get_bot_command_service

router = APIRouter()


@router.post("/{bot_id}/commands",
             response_model=BotCommandResponse, status_code=201)
async def create_command(
    bot_id: int,
    data: BotCommandCreate,
    bot_service: BotCrudService = Depends(get_bot_service),
    command_service: BotCommandService = Depends(get_bot_command_service),
    current_user: User = Depends(get_current_user),
):
    """Создать команду для бота."""
    bot = await bot_service.get(bot_id, owner_id=current_user.id)

    return await command_service.create(bot_id, data, owner_id=current_user.id)


@router.get("/{bot_id}/commands", response_model=BotCommandListResponse)
async def get_commands(
    bot_id: int,
    is_active: Optional[bool] = None,
    bot_service: BotCrudService = Depends(get_bot_service),
    command_service: BotCommandService = Depends(get_bot_command_service),
    current_user: User = Depends(get_current_user),
):
    """Получить список команд бота."""
    bot = await bot_service.get(bot_id, owner_id=current_user.id)
    commands, total = await command_service.get_list(bot_id, is_active, owner_id=current_user.id)
    return BotCommandListResponse(items=commands, total=total)


@router.get("/{bot_id}/commands/{command_id}",
            response_model=BotCommandResponse)
async def get_command(
    bot_id: int,
    command_id: int,
    command_service: BotCommandService = Depends(get_bot_command_service),
    current_user: User = Depends(get_current_user),
):
    """Получить команду по ID."""
    command = await command_service.get(command_id, owner_id=current_user.id)
    return command


@router.put("/{bot_id}/commands/{command_id}",
            response_model=BotCommandResponse)
async def update_command(
    bot_id: int,
    command_id: int,
    data: BotCommandUpdate,
    command_service: BotCommandService = Depends(get_bot_command_service),
    current_user: User = Depends(get_current_user),
):
    """Обновить команду."""
    command = await command_service.get(command_id, owner_id=current_user.id)
    updated = await command_service.update(command_id, data, owner_id=current_user.id)
    return updated


@router.delete("/{bot_id}/commands/{command_id}", status_code=204)
async def delete_command(
    bot_id: int,
    command_id: int,
    command_service: BotCommandService = Depends(get_bot_command_service),
    current_user: User = Depends(get_current_user),
):
    """Удалить команду."""
    await command_service.delete(command_id, owner_id=current_user.id)
