from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.antispam import AntispamSettingsResponse, AntispamSettingsUpdate
from backend.services.channel.features.antispam import UpdateAntispamSettings
from backend.services.channel.utils.query_utils import find_channel_or_404

router = APIRouter()


def build_antispam_response(channel) -> AntispamSettingsResponse:
    """Достаёт поля антиспам-настроек из канала в response-модель."""
    return AntispamSettingsResponse(
        link_filter_mode=channel.link_filter_mode,
        link_whitelist=channel.link_whitelist,
        link_blacklist=channel.link_blacklist,
        link_filter_action=channel.link_filter_action,
        link_filter_mute_duration=channel.link_filter_mute_duration,
    )


@router.get(
    "/{channel_id}/antispam",
    response_model=AntispamSettingsResponse,
    summary="Получить настройки антиспама (фильтр ссылок) канала",
)
async def get_antispam_settings(
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    return build_antispam_response(channel)


@router.put(
    "/{channel_id}/antispam",
    response_model=AntispamSettingsResponse,
    summary="Обновить настройки антиспама (режим фильтра, белый/чёрный список, действие)",
)
async def update_antispam_settings(
    data: AntispamSettingsUpdate,
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await UpdateAntispamSettings(db).execute(
        channel_id=channel_id,
        owner_id=current_user.id,
        link_filter_mode=data.link_filter_mode,
        link_whitelist=data.link_whitelist,
        link_blacklist=data.link_blacklist,
        link_filter_action=data.link_filter_action,
        link_filter_mute_duration=data.link_filter_mute_duration,
    )
    return build_antispam_response(channel)
