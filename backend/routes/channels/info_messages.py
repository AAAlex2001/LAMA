from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.info_messages import (
    AutoReplyToggle,
    InfoMessageCreate,
    InfoMessageResponse,
    InfoMessagesListResponse,
    InfoMessagesToggle,
    InfoMessageUpdate,
)
from backend.services.channel.features.info_messages.create_message import CreateInfoMessage
from backend.services.channel.features.info_messages.delete_message import DeleteInfoMessage
from backend.services.channel.features.info_messages.generate_share_token import GenerateShareToken
from backend.services.channel.features.info_messages.list_messages import ListInfoMessages
from backend.services.channel.features.info_messages.publish_message import PublishInfoMessage
from backend.services.channel.features.info_messages.toggle_auto_reply import ToggleAutoReply
from backend.services.channel.features.info_messages.toggle_enabled import ToggleInfoMessages
from backend.services.channel.features.info_messages.update_message import UpdateInfoMessage

router = APIRouter()


@router.get("/{channel_id}/info-messages", response_model=InfoMessagesListResponse)
async def list_info_messages(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ListInfoMessages(db).execute(channel_id=channel_id, owner_id=current_user.id)


@router.put("/{channel_id}/auto-replies/toggle")
async def toggle_auto_reply_enabled(
    channel_id: int,
    data: AutoReplyToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ToggleAutoReply(db).execute(channel_id=channel_id, enabled=data.enabled, owner_id=current_user.id)
    return {"ok": True}


@router.put("/{channel_id}/info-messages/toggle")
async def toggle_info_messages(
    channel_id: int,
    data: InfoMessagesToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ToggleInfoMessages(db).execute(channel_id=channel_id, enabled=data.enabled, owner_id=current_user.id)
    return {"ok": True}


@router.post("/{channel_id}/info-messages", response_model=InfoMessageResponse, status_code=201)
async def create_info_message(
    channel_id: int,
    data: InfoMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateInfoMessage(db).execute(channel_id=channel_id, data=data, owner_id=current_user.id)


@router.put("/{channel_id}/info-messages/{message_id}", response_model=InfoMessageResponse)
async def update_info_message(
    channel_id: int,
    message_id: int,
    data: InfoMessageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateInfoMessage(db).execute(
        channel_id=channel_id, message_id=message_id, data=data, owner_id=current_user.id,
    )


@router.delete("/{channel_id}/info-messages/{message_id}", status_code=204)
async def delete_info_message(
    channel_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteInfoMessage(db).execute(channel_id=channel_id, message_id=message_id, owner_id=current_user.id)


@router.post("/{channel_id}/info-messages/{message_id}/publish", response_model=InfoMessageResponse)
async def publish_info_message(
    channel_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await PublishInfoMessage(db).execute(
        channel_id=channel_id, message_id=message_id, owner_id=current_user.id,
    )


@router.post("/{channel_id}/info-messages/{message_id}/share")
async def share_info_message(
    channel_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    token = await GenerateShareToken(db).execute(
        channel_id=channel_id, message_id=message_id, owner_id=current_user.id,
    )
    return {"share_token": token}
