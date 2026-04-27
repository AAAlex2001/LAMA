from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels import (
    AntispamSettingsResponse,
    AntispamSettingsUpdate,
    CaptchaSettingsResponse,
    CaptchaSettingsUpdate,
    ChannelAutoDeleteSettingsResponse,
    ChannelAutoDeleteSettingsUpdate,
    FloodSettingsResponse,
    FloodSettingsUpdate,
)
from backend.services.channel.utils.query_utils import find_channel_or_404
from backend.services.channel.features.antispam import UpdateAntispamSettings
from backend.services.channel.features.auto_delete import (
    GetAutoDeleteSettings,
    UpdateAutoDeleteSettings,
)
from backend.services.channel.features.banned_words import ToggleBannedWords
from backend.services.channel.features.captcha import UpdateCaptchaSettings
from backend.services.channel.features.flood import UpdateFloodSettings
from backend.services.channel.features.media_block import UpdateMediaBlock
from backend.services.channel.features.night_mode import UpdateNightModeSettings
from backend.services.channel.features.quick_commands import UpdateQuickCommands


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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
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
    return FloodSettingsResponse(
        flood_message_limit=channel.flood_message_limit,
        flood_interval_seconds=channel.flood_interval_seconds,
        flood_action=channel.flood_action,
        flood_mute_duration_minutes=channel.flood_mute_duration_minutes,
    )


@router.get("/{channel_id}/flood", response_model=FloodSettingsResponse)
async def get_flood_settings(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await ToggleBannedWords(db).execute(channel_id, current_user.id, data.enabled)
    return BannedWordsToggleResponse(banned_words_enabled=channel.banned_words_enabled)


@router.get("/{channel_id}/banned-words/toggle", response_model=BannedWordsToggleResponse)
async def get_banned_words_toggle(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    return BannedWordsToggleResponse(banned_words_enabled=channel.banned_words_enabled)


@router.get("/{channel_id}/auto-delete", response_model=ChannelAutoDeleteSettingsResponse)
async def get_auto_delete_settings(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await GetAutoDeleteSettings(db).execute(channel_id, owner_id=current_user.id)


@router.put("/{channel_id}/auto-delete", response_model=ChannelAutoDeleteSettingsResponse)
async def update_auto_delete_settings(
    channel_id: int,
    data: ChannelAutoDeleteSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateAutoDeleteSettings(db).execute(channel_id, current_user.id, data)


@router.get("/{channel_id}/quick-commands", response_model=QuickCommandsResponse)
async def get_quick_commands(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    return QuickCommandsResponse(
        commands_enabled=channel.commands_enabled,
        enabled_commands=channel.enabled_commands,
    )


@router.put("/{channel_id}/quick-commands", response_model=QuickCommandsResponse)
async def update_quick_commands(
    channel_id: int,
    data: QuickCommandsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await UpdateQuickCommands(db).execute(
        channel_id, current_user.id, data.commands_enabled, data.enabled_commands,
    )
    return QuickCommandsResponse(
        commands_enabled=channel.commands_enabled,
        enabled_commands=channel.enabled_commands,
    )


@router.get("/{channel_id}/media-block", response_model=MediaBlockResponse)
async def get_media_block(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    return MediaBlockResponse(block_media_types=channel.block_media_types)


@router.put("/{channel_id}/media-block", response_model=MediaBlockResponse)
async def update_media_block(
    channel_id: int,
    data: MediaBlockUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await UpdateMediaBlock(db).execute(channel_id, current_user.id, data.block_media_types)
    return MediaBlockResponse(block_media_types=channel.block_media_types)


@router.get("/{channel_id}/night-mode", response_model=NightModeResponse)
async def get_night_mode(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
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
    return NightModeResponse(
        night_mode_enabled=channel.night_mode_enabled,
        night_mode_start=channel.night_mode_start,
        night_mode_end=channel.night_mode_end,
        night_mode_block_media=channel.night_mode_block_media,
        night_mode_block_text=channel.night_mode_block_text,
    )


@router.get("/{channel_id}/captcha", response_model=CaptchaSettingsResponse)
async def get_captcha_settings(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    return CaptchaSettingsResponse(
        captcha_enabled=channel.captcha_enabled,
        captcha_timeout_seconds=channel.captcha_timeout_seconds,
        captcha_fail_action=channel.captcha_fail_action,
        captcha_fail_duration_seconds=channel.captcha_fail_duration_seconds,
        captcha_restriction_type=channel.captcha_restriction_type,
        captcha_message_before=channel.captcha_message_before,
        captcha_message_fail=channel.captcha_message_fail,
        captcha_message_success=channel.captcha_message_success,
    )


@router.put("/{channel_id}/captcha", response_model=CaptchaSettingsResponse)
async def update_captcha_settings(
    channel_id: int,
    data: CaptchaSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await UpdateCaptchaSettings(db).execute(
        channel_id=channel_id,
        owner_id=current_user.id,
        enabled=data.captcha_enabled,
        timeout_seconds=data.captcha_timeout_seconds,
        fail_action=data.captcha_fail_action,
        fail_duration_seconds=data.captcha_fail_duration_seconds,
        restriction_type=data.captcha_restriction_type,
        message_before=data.captcha_message_before,
        message_fail=data.captcha_message_fail,
        message_success=data.captcha_message_success,
    )
    return CaptchaSettingsResponse(
        captcha_enabled=channel.captcha_enabled,
        captcha_timeout_seconds=channel.captcha_timeout_seconds,
        captcha_fail_action=channel.captcha_fail_action,
        captcha_fail_duration_seconds=channel.captcha_fail_duration_seconds,
        captcha_restriction_type=channel.captcha_restriction_type,
        captcha_message_before=channel.captcha_message_before,
        captcha_message_fail=channel.captcha_message_fail,
        captcha_message_success=channel.captcha_message_success,
    )
