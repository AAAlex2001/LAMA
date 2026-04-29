from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.models.channels import BackupMode
from backend.routes.auth import get_current_user
from backend.schemas.channels import (
    ChannelGroupCreate,
    ChannelGroupListResponse,
    ChannelGroupResponse,
    ChannelGroupUpdate,
    ChannelType,
)
from backend.services.channel.features.crud.create_channel import CreateChannel
from backend.services.channel.features.crud.delete_channel import DeleteChannel
from backend.services.channel.features.crud.list_channels import ListChannels
from backend.services.channel.features.crud.update_channel import UpdateChannel
from backend.services.channel.utils.query_utils import find_channel_or_404

router = APIRouter()


@router.post("/", response_model=ChannelGroupResponse, status_code=201)
async def create_channel(
    data: ChannelGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateChannel(db).execute(data, owner_id=current_user.id)


@router.get("/", response_model=ChannelGroupListResponse)
async def list_channels(
    page: int = 1,
    page_size: int = 50,
    channel_type: Optional[ChannelType] = None,
    is_active: Optional[bool] = None,
    backup_mode: Optional[BackupMode] = None,
    force_refresh: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channels, total = await ListChannels(db).execute(
        owner_id=current_user.id,
        page=page,
        page_size=page_size,
        channel_type=channel_type,
        is_active=is_active,
        backup_mode=backup_mode,
        force_refresh=force_refresh,
    )
    return ChannelGroupListResponse(items=channels, total=total, page=page, page_size=page_size)


@router.get("/{channel_id}", response_model=ChannelGroupResponse)
async def get_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_channel_or_404(db, channel_id, owner_id=current_user.id, load_bot=True)


@router.put("/{channel_id}", response_model=ChannelGroupResponse)
async def update_channel(
    channel_id: int,
    data: ChannelGroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateChannel(db).execute(channel_id, data, owner_id=current_user.id)


@router.delete("/{channel_id}")
async def delete_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteChannel(db).execute(channel_id, owner_id=current_user.id)
    return {"success": True, "message": "Channel deleted successfully"}
