from fastapi import APIRouter, Depends

from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.routes.channels.dependencies import get_channel_service, get_sync_service
from backend.schemas.channels import ChannelGroupResponse, SyncChannelRequest, SyncChannelResponse
from backend.services.channel.channel_service import ChannelService
from backend.services.channel.sync_service import SyncService

router = APIRouter()


@router.post("/sync", response_model=SyncChannelResponse)
async def sync_channel(
    data: SyncChannelRequest,
    service: SyncService = Depends(get_sync_service),
    current_user: User = Depends(get_current_user),
):
    channel = await service.sync_from_telegram(
        telegram_id=data.telegram_id,
        username=data.username,
        invite_link=data.invite_link,
        owner_id=current_user.id,
        bot_id=data.bot_id,
        token=data.token,
    )
    return SyncChannelResponse(success=True, channel=channel, message="Channel synchronized successfully")


@router.post("/{channel_id}/sync", response_model=ChannelGroupResponse)
async def sync_existing_channel(
    channel_id: int,
    channel_service: ChannelService = Depends(get_channel_service),
    sync_service: SyncService = Depends(get_sync_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)

    return await sync_service.sync_from_telegram(
        telegram_id=channel.telegram_id,
        username=channel.username,
        invite_link=channel.invite_link,
        owner_id=current_user.id,
        bot_id=channel.bot_id,
    )
