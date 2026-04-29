from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.channel import ChannelGroupResponse
from backend.schemas.channels.sync import SyncChannelRequest, SyncChannelResponse
from backend.services.channel.features.sync.sync_channel import SyncChannelFromTelegram
from backend.services.channel.utils.query_utils import find_channel_or_404

router = APIRouter()


@router.post("/sync", response_model=SyncChannelResponse)
async def sync_channel(
    data: SyncChannelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await SyncChannelFromTelegram(db).execute(
        owner_id=current_user.id,
        telegram_id=data.telegram_id,
        username=data.username,
        invite_link=data.invite_link,
        bot_id=data.bot_id,
        token=data.token,
    )
    return SyncChannelResponse(success=True, channel=channel, message="Channel synchronized successfully")


@router.post("/{channel_id}/sync", response_model=ChannelGroupResponse)
async def sync_existing_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)

    return await SyncChannelFromTelegram(db).execute(
        owner_id=current_user.id,
        telegram_id=channel.telegram_id,
        username=channel.username,
        invite_link=channel.invite_link,
        bot_id=channel.bot_id,
    )
