from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.flood import FloodSettingsResponse, FloodSettingsUpdate
from backend.services.channel.features.flood import UpdateFloodSettings
from backend.services.channel.utils.query_utils import find_channel_or_404

router = APIRouter()


def build_flood_response(channel) -> FloodSettingsResponse:
    """Достаёт поля флуд-настроек из канала в response-модель."""
    return FloodSettingsResponse(
        flood_message_limit=channel.flood_message_limit,
        flood_interval_seconds=channel.flood_interval_seconds,
        flood_action=channel.flood_action,
        flood_mute_duration_minutes=channel.flood_mute_duration_minutes,
    )


@router.get(
    "/{channel_id}/flood",
    response_model=FloodSettingsResponse,
    summary="Получить настройки антифлуда канала",
)
async def get_flood_settings(
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    return build_flood_response(channel)


@router.put(
    "/{channel_id}/flood",
    response_model=FloodSettingsResponse,
    summary="Обновить настройки антифлуда (лимит сообщений, окно, действие)",
)
async def update_flood_settings(
    data: FloodSettingsUpdate,
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await UpdateFloodSettings(db).execute(
        channel_id=channel_id,
        owner_id=current_user.id,
        message_limit=data.flood_message_limit,
        interval_seconds=data.flood_interval_seconds,
        action=data.flood_action,
        mute_duration_minutes=data.flood_mute_duration_minutes,
    )
    return build_flood_response(channel)
