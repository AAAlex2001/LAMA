from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.channel import (
    ChannelGroupResponse,
    ChannelPermissionsUpdate,
    ChannelTelegramUpdate,
)
from backend.services.channel.features.telegram_settings import (
    DeleteChannelPhoto,
    PinChannelMessage,
    SetChannelPermissions,
    UnpinChannelMessage,
    UpdateTelegramSettings,
    UploadChannelPhotoBytes,
)

router = APIRouter()

NIGHT_MODE_KEYS = (
    "night_mode_enabled",
    "night_mode_start",
    "night_mode_end",
    "night_mode_block_media",
    "night_mode_block_text",
)


@router.put("/{channel_id}/telegram-settings", response_model=ChannelGroupResponse)
async def update_channel_telegram_settings(
    channel_id: int,
    data: ChannelTelegramUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateTelegramSettings(db).execute(
        channel_id=channel_id,
        owner_id=current_user.id,
        title=data.title,
        description=data.description,
        photo_file_path=data.photo_file_path,
    )


@router.delete("/{channel_id}/telegram-photo", response_model=ChannelGroupResponse)
async def delete_channel_telegram_photo(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DeleteChannelPhoto(db).execute(channel_id, owner_id=current_user.id)


@router.post("/{channel_id}/telegram-photo", response_model=ChannelGroupResponse, status_code=200)
async def upload_channel_telegram_photo(
    channel_id: int,
    photo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await photo.read()
    return await UploadChannelPhotoBytes(db).execute(
        channel_id=channel_id,
        owner_id=current_user.id,
        data=data,
        filename=photo.filename or "photo.jpg",
    )


@router.put("/{channel_id}/permissions", response_model=ChannelGroupResponse)
async def set_channel_telegram_permissions(
    channel_id: int,
    data: ChannelPermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = data.model_dump(exclude_none=True)
    night_mode_settings = {key: payload.pop(key) for key in NIGHT_MODE_KEYS if key in payload}

    return await SetChannelPermissions(db).execute(
        channel_id=channel_id,
        owner_id=current_user.id,
        permissions=payload,
        night_mode_settings=night_mode_settings or None,
    )


@router.post("/{channel_id}/pin-message", response_model=ChannelGroupResponse)
async def pin_message_in_channel(
    channel_id: int,
    message_id: int = Query(..., description="ID сообщения для закрепления"),
    disable_notification: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await PinChannelMessage(db).execute(
        channel_id=channel_id,
        owner_id=current_user.id,
        message_id=message_id,
        disable_notification=disable_notification,
    )


@router.delete("/{channel_id}/unpin-message", response_model=ChannelGroupResponse)
async def unpin_message_in_channel(
    channel_id: int,
    message_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UnpinChannelMessage(db).execute(
        channel_id=channel_id,
        owner_id=current_user.id,
        message_id=message_id,
    )
