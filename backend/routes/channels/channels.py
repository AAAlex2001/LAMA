from typing import Optional

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.models.channels import BackupMode
from backend.routes.auth import get_current_user
from backend.schemas.channels.channel import (
    ChannelGroupCreate,
    ChannelGroupListResponse,
    ChannelGroupResponse,
    ChannelGroupUpdate,
)
from backend.schemas.channels.enums import ChannelType
from backend.services.channel.features.crud.create_channel import CreateChannel
from backend.services.channel.features.crud.delete_channel import DeleteChannel
from backend.services.channel.features.crud.list_channels import ListChannels
from backend.services.channel.features.crud.update_channel import UpdateChannel
from backend.services.channel.utils.query_utils import find_channel_or_404

router = APIRouter()


@router.post(
    "/",
    response_model=ChannelGroupResponse,
    status_code=201,
    summary="Создать канал/группу",
)
async def create_channel(
    data: ChannelGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateChannel(db).execute(data, owner_id=current_user.id)


@router.get(
    "/",
    response_model=ChannelGroupListResponse,
    summary="Список каналов пользователя с фильтрами",
)
async def list_channels(
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1."),
    page_size: int = Query(50, ge=1, le=200, description="Размер страницы."),
    channel_type: Optional[ChannelType] = Query(
        None,
        description="Фильтр по типу: CHANNEL / GROUP / SUPERGROUP.",
    ),
    is_active: Optional[bool] = Query(
        None,
        description="Только активные (true) или только неактивные (false).",
    ),
    backup_mode: Optional[BackupMode] = Query(
        None,
        description="Фильтр по режиму бэкапа: DISABLED / ENABLED / INSTANT / POST_FACTUM.",
    ),
    force_refresh: bool = Query(
        False,
        description="Если true — заново синхронизировать stale-каналы с Telegram перед выдачей.",
    ),
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


@router.get(
    "/{channel_id}",
    response_model=ChannelGroupResponse,
    summary="Получить канал по id",
)
async def get_channel(
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_channel_or_404(db, channel_id, owner_id=current_user.id, load_bot=True)


@router.put(
    "/{channel_id}",
    response_model=ChannelGroupResponse,
    summary="Обновить канал",
)
async def update_channel(
    data: ChannelGroupUpdate,
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateChannel(db).execute(channel_id, data, owner_id=current_user.id)


@router.delete(
    "/{channel_id}",
    summary="Удалить канал (с очисткой связанных публикаций и бэкапов)",
)
async def delete_channel(
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteChannel(db).execute(channel_id, owner_id=current_user.id)
    return {"success": True, "message": "Channel deleted successfully"}
