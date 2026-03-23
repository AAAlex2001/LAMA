from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional

from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.routes.channels.dependencies import (
    get_antispam_service,
    get_auto_delete_service,
    get_channel_service,
    get_flood_service,
    get_moderation_service,
    get_night_mode_service,
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
from backend.services.channel.moderation_service import ModerationService
from backend.services.channel.night_mode_service import NightModeService


class BannedWordsToggle(BaseModel):
    enabled: bool


class BannedWordsToggleResponse(BaseModel):
    banned_words_enabled: bool


class QuickCommandsUpdate(BaseModel):
    commands_enabled: bool
    enabled_commands: Optional[List[str]] = None


class QuickCommandsResponse(BaseModel):
    commands_enabled: bool
    enabled_commands: Optional[List[str]] = None


class MediaBlockUpdate(BaseModel):
    block_media_types: Optional[List[str]] = None


class MediaBlockResponse(BaseModel):
    block_media_types: Optional[List[str]] = None


class NightModeUpdate(BaseModel):
    night_mode_enabled: bool
    night_mode_start: Optional[str] = None
    night_mode_end: Optional[str] = None
    night_mode_block_media: bool = False
    night_mode_block_text: bool = False


class NightModeResponse(BaseModel):
    night_mode_enabled: bool
    night_mode_start: Optional[str] = None
    night_mode_end: Optional[str] = None
    night_mode_block_media: bool
    night_mode_block_text: bool


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


@router.put("/{channel_id}/banned-words/toggle", response_model=BannedWordsToggleResponse)
async def toggle_banned_words(
    channel_id: int,
    data: BannedWordsToggle,
    service: ModerationService = Depends(get_moderation_service),
    current_user: User = Depends(get_current_user),
):
    channel = await service.toggle_banned_words(channel_id, data.enabled, owner_id=current_user.id)
    return BannedWordsToggleResponse(banned_words_enabled=channel.banned_words_enabled)


@router.get("/{channel_id}/banned-words/toggle", response_model=BannedWordsToggleResponse)
async def get_banned_words_toggle(
    channel_id: int,
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    return BannedWordsToggleResponse(banned_words_enabled=channel.banned_words_enabled)


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


@router.get("/{channel_id}/quick-commands", response_model=QuickCommandsResponse)
async def get_quick_commands(
    channel_id: int,
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    return QuickCommandsResponse(
        commands_enabled=channel.commands_enabled,
        enabled_commands=channel.enabled_commands,
    )


@router.put("/{channel_id}/quick-commands", response_model=QuickCommandsResponse)
async def update_quick_commands(
    channel_id: int,
    data: QuickCommandsUpdate,
    service: ModerationService = Depends(get_moderation_service),
    current_user: User = Depends(get_current_user),
):
    channel = await service.update_quick_commands(
        channel_id, data.commands_enabled, data.enabled_commands, owner_id=current_user.id,
    )
    return QuickCommandsResponse(
        commands_enabled=channel.commands_enabled,
        enabled_commands=channel.enabled_commands,
    )


@router.get("/{channel_id}/media-block", response_model=MediaBlockResponse)
async def get_media_block(
    channel_id: int,
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    return MediaBlockResponse(block_media_types=channel.block_media_types)


@router.put("/{channel_id}/media-block", response_model=MediaBlockResponse)
async def update_media_block(
    channel_id: int,
    data: MediaBlockUpdate,
    service: ModerationService = Depends(get_moderation_service),
    current_user: User = Depends(get_current_user),
):
    channel = await service.update_media_block(
        channel_id, data.block_media_types, owner_id=current_user.id,
    )
    return MediaBlockResponse(block_media_types=channel.block_media_types)


@router.get("/{channel_id}/night-mode", response_model=NightModeResponse)
async def get_night_mode(
    channel_id: int,
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    return NightModeResponse(
        night_mode_enabled=channel.night_mode_enabled,
        night_mode_start=channel.night_mode_start,
        night_mode_end=channel.night_mode_end,
        night_mode_block_media=channel.night_mode_block_media,
        night_mode_block_text=channel.night_mode_block_text,
    )


@router.put("/{channel_id}/night-mode", response_model=NightModeResponse)
async def update_night_mode(
    channel_id: int,
    data: NightModeUpdate,
    service: NightModeService = Depends(get_night_mode_service),
    current_user: User = Depends(get_current_user),
):
    channel = await service.update_settings(
        channel_id=channel_id,
        owner_id=current_user.id,
        night_mode_enabled=data.night_mode_enabled,
        night_mode_start=data.night_mode_start,
        night_mode_end=data.night_mode_end,
        night_mode_block_media=data.night_mode_block_media,
        night_mode_block_text=data.night_mode_block_text,
    )
    return NightModeResponse(
        night_mode_enabled=channel.night_mode_enabled,
        night_mode_start=channel.night_mode_start,
        night_mode_end=channel.night_mode_end,
        night_mode_block_media=channel.night_mode_block_media,
        night_mode_block_text=channel.night_mode_block_text,
    )
