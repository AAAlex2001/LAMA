from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from backend.models.auth import User
from backend.models.channels import BackupMode
from backend.routes.auth import get_current_user
from backend.routes.channels.dependencies import get_channel_service
from backend.schemas.channels import (
    ChannelGroupCreate,
    ChannelGroupListResponse,
    ChannelGroupResponse,
    ChannelGroupUpdate,
    ChannelType,
)
from backend.services.channel.channel_service import ChannelService

router = APIRouter()


@router.post("/", response_model=ChannelGroupResponse, status_code=201)
async def create_channel(
    data: ChannelGroupCreate,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    return await service.create(data, owner_id=current_user.id)


@router.get("/", response_model=ChannelGroupListResponse)
async def list_channels(
    page: int = 1,
    page_size: int = 50,
    channel_type: Optional[ChannelType] = None,
    is_active: Optional[bool] = None,
    backup_mode: Optional[BackupMode] = None,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channels, total = await service.list(
        owner_id=current_user.id,
        page=page,
        page_size=page_size,
        channel_type=channel_type,
        is_active=is_active,
        backup_mode=backup_mode,
    )
    return ChannelGroupListResponse(items=channels, total=total, page=page, page_size=page_size)


@router.get("/{channel_id}", response_model=ChannelGroupResponse)
async def get_channel(
    channel_id: int,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await service.get(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@router.put("/{channel_id}", response_model=ChannelGroupResponse)
async def update_channel(
    channel_id: int,
    data: ChannelGroupUpdate,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await service.update(channel_id, data, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@router.delete("/{channel_id}")
async def delete_channel(
    channel_id: int,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    success = await service.delete(channel_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Channel not found")
    return {"success": True, "message": "Channel deleted successfully"}
