from typing import Optional

from fastapi import APIRouter, Depends, Query

from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.routes.channels.dependencies import get_telegram_settings_service
from backend.schemas.channels import ChannelGroupResponse, ChannelPermissionsUpdate, ChannelTelegramUpdate
from backend.services.channel.telegram_settings_service import TelegramSettingsService

router = APIRouter()


@router.put("/{channel_id}/telegram-settings", response_model=ChannelGroupResponse)
async def update_channel_telegram_settings(
    channel_id: int,
    data: ChannelTelegramUpdate,
    service: TelegramSettingsService = Depends(get_telegram_settings_service),
    current_user: User = Depends(get_current_user),
):
    return await service.update_settings(
        channel_id=channel_id,
        owner_id=current_user.id,
        title=data.title,
        description=data.description,
        photo_file_path=data.photo_file_path,
    )


@router.delete("/{channel_id}/telegram-photo", response_model=ChannelGroupResponse)
async def delete_channel_telegram_photo(
    channel_id: int,
    service: TelegramSettingsService = Depends(get_telegram_settings_service),
    current_user: User = Depends(get_current_user),
):
    return await service.delete_photo(channel_id=channel_id, owner_id=current_user.id)


@router.put("/{channel_id}/permissions", response_model=ChannelGroupResponse)
async def set_channel_telegram_permissions(
    channel_id: int,
    data: ChannelPermissionsUpdate,
    service: TelegramSettingsService = Depends(get_telegram_settings_service),
    current_user: User = Depends(get_current_user),
):
    payload = data.model_dump(exclude_none=True)
    night_mode_keys = [
        "night_mode_enabled",
        "night_mode_start",
        "night_mode_end",
        "night_mode_block_media",
        "night_mode_block_text",
    ]
    night_mode_settings = {}
    for key in night_mode_keys:
        if key in payload:
            night_mode_settings[key] = payload.pop(key)

    permissions = payload


    return await service.set_permissions(
        channel_id=channel_id,
        owner_id=current_user.id,
        permissions=permissions,
        night_mode_settings=night_mode_settings or None,
    )


@router.post("/{channel_id}/pin-message", response_model=ChannelGroupResponse)
async def pin_message_in_channel(
    channel_id: int,
    message_id: int = Query(..., description="ID сообщения для закрепления"),
    disable_notification: bool = Query(False),
    service: TelegramSettingsService = Depends(get_telegram_settings_service),
    current_user: User = Depends(get_current_user),
):
    return await service.pin_message(
        channel_id=channel_id,
        owner_id=current_user.id,
        message_id=message_id,
        disable_notification=disable_notification,
    )


@router.delete("/{channel_id}/unpin-message", response_model=ChannelGroupResponse)
async def unpin_message_in_channel(
    channel_id: int,
    message_id: Optional[int] = Query(None),
    service: TelegramSettingsService = Depends(get_telegram_settings_service),
    current_user: User = Depends(get_current_user),
):
    return await service.unpin_message(
        channel_id=channel_id,
        owner_id=current_user.id,
        message_id=message_id,
    )
