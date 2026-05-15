from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.night_mode import NightModeResponse, NightModeUpdate
from backend.services.channel.features.night_mode import UpdateNightModeSettings
from backend.services.channel.utils.query_utils import find_channel_or_404

router = APIRouter()


def build_night_mode_response(channel) -> NightModeResponse:
    """Достаёт поля ночного режима из канала в response-модель."""
    return NightModeResponse(
        night_mode_enabled=channel.night_mode_enabled,
        night_mode_start=channel.night_mode_start,
        night_mode_end=channel.night_mode_end,
        night_mode_block_media=channel.night_mode_block_media,
        night_mode_block_text=channel.night_mode_block_text,
    )


@router.get(
    "/{channel_id}/night-mode",
    response_model=NightModeResponse,
    summary="Получить настройки ночного режима канала (тихие часы)",
)
async def get_night_mode(
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    return build_night_mode_response(channel)


@router.put(
    "/{channel_id}/night-mode",
    response_model=NightModeResponse,
    summary="Обновить настройки ночного режима (включение, окно времени, что блокировать)",
)
async def update_night_mode(
    data: NightModeUpdate,
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await UpdateNightModeSettings(db).execute(
        channel_id=channel_id,
        owner_id=current_user.id,
        enabled=data.night_mode_enabled,
        start=data.night_mode_start,
        end=data.night_mode_end,
        block_media=data.night_mode_block_media,
        block_text=data.night_mode_block_text,
    )
    return build_night_mode_response(channel)
