from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.quick_commands import QuickCommandsResponse, QuickCommandsUpdate
from backend.services.channel.features.quick_commands import UpdateQuickCommands
from backend.services.channel.utils.query_utils import find_channel_or_404

router = APIRouter()


def build_quick_commands_response(channel) -> QuickCommandsResponse:
    """Достаёт поля быстрых команд из канала в response-модель."""
    return QuickCommandsResponse(
        commands_enabled=channel.commands_enabled,
        enabled_commands=channel.enabled_commands,
    )


@router.get(
    "/{channel_id}/quick-commands",
    response_model=QuickCommandsResponse,
    summary="Получить настройки быстрых команд бота в канале",
)
async def get_quick_commands(
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    return build_quick_commands_response(channel)


@router.put(
    "/{channel_id}/quick-commands",
    response_model=QuickCommandsResponse,
    summary="Обновить настройки быстрых команд (включение + список разрешённых)",
)
async def update_quick_commands(
    data: QuickCommandsUpdate,
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await UpdateQuickCommands(db).execute(
        channel_id,
        current_user.id,
        data.commands_enabled,
        data.enabled_commands,
    )
    return build_quick_commands_response(channel)
