from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.auto_delete import (
    ChannelAutoDeleteSettingsResponse,
    ChannelAutoDeleteSettingsUpdate,
)
from backend.services.channel.features.auto_delete import (
    GetAutoDeleteSettings,
    UpdateAutoDeleteSettings,
)

router = APIRouter()


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
