from fastapi import APIRouter, Depends

from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.routes.channels.dependencies import (
    get_antispam_service,
    get_auto_delete_service,
    get_channel_service,
    get_flood_service,
)
from backend.schemas.channels import (
    AntispamSettingsResponse,
    AntispamSettingsUpdate,
    ChannelAutoDeleteSettingsResponse,
    ChannelAutoDeleteSettingsUpdate,
    FloodSettingsResponse,
    FloodSettingsUpdate,
)
from backend.services.channel.antispam_service import AntispamService
from backend.services.channel.auto_delete_service import AutoDeleteService
from backend.services.channel.channel_service import ChannelService
from backend.services.channel.flood_service import FloodService

router = APIRouter()


@router.put("/{channel_id}/antispam", response_model=AntispamSettingsResponse)
async def update_antispam_settings(
    channel_id: int,
    data: AntispamSettingsUpdate,
    service: AntispamService = Depends(get_antispam_service),
    current_user: User = Depends(get_current_user),
):
    channel = await service.update_settings(
        channel_id=channel_id,
        owner_id=current_user.id,
        link_filter_mode=data.link_filter_mode,
        link_whitelist=data.link_whitelist,
        link_blacklist=data.link_blacklist,
        link_filter_action=data.link_filter_action,
        link_filter_mute_duration=data.link_filter_mute_duration,
    )
    return AntispamSettingsResponse(
        link_filter_mode=channel.link_filter_mode,
        link_whitelist=channel.link_whitelist,
        link_blacklist=channel.link_blacklist,
        link_filter_action=channel.link_filter_action,
        link_filter_mute_duration=channel.link_filter_mute_duration,
    )


@router.get("/{channel_id}/antispam", response_model=AntispamSettingsResponse)
async def get_antispam_settings(
    channel_id: int,
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    return AntispamSettingsResponse(
        link_filter_mode=channel.link_filter_mode,
        link_whitelist=channel.link_whitelist,
        link_blacklist=channel.link_blacklist,
        link_filter_action=channel.link_filter_action,
        link_filter_mute_duration=channel.link_filter_mute_duration,
    )


@router.put("/{channel_id}/flood", response_model=FloodSettingsResponse)
async def update_flood_settings(
    channel_id: int,
    data: FloodSettingsUpdate,
    service: FloodService = Depends(get_flood_service),
    current_user: User = Depends(get_current_user),
):
    channel = await service.update_settings(
        channel_id=channel_id,
        owner_id=current_user.id,
        flood_message_limit=data.flood_message_limit,
        flood_interval_seconds=data.flood_interval_seconds,
        flood_action=data.flood_action,
        flood_mute_duration_minutes=data.flood_mute_duration_minutes,
    )
    return FloodSettingsResponse(
        flood_message_limit=channel.flood_message_limit,
        flood_interval_seconds=channel.flood_interval_seconds,
        flood_action=channel.flood_action,
        flood_mute_duration_minutes=channel.flood_mute_duration_minutes,
    )


@router.get("/{channel_id}/flood", response_model=FloodSettingsResponse)
async def get_flood_settings(
    channel_id: int,
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    return FloodSettingsResponse(
        flood_message_limit=channel.flood_message_limit,
        flood_interval_seconds=channel.flood_interval_seconds,
        flood_action=channel.flood_action,
        flood_mute_duration_minutes=channel.flood_mute_duration_minutes,
    )


@router.get("/{channel_id}/auto-delete", response_model=ChannelAutoDeleteSettingsResponse)
async def get_auto_delete_settings(
    channel_id: int,
    service: AutoDeleteService = Depends(get_auto_delete_service),
    current_user: User = Depends(get_current_user),
):
    return await service.get_settings(channel_id, owner_id=current_user.id)


@router.put("/{channel_id}/auto-delete", response_model=ChannelAutoDeleteSettingsResponse)
async def update_auto_delete_settings(
    channel_id: int,
    data: ChannelAutoDeleteSettingsUpdate,
    service: AutoDeleteService = Depends(get_auto_delete_service),
    current_user: User = Depends(get_current_user),
):
    return await service.update_settings(channel_id, data, owner_id=current_user.id)
