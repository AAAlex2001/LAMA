from fastapi import APIRouter, Depends

from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.routes.channels.dependencies import get_info_messages_service
from backend.schemas.channels.info_messages import (
    InfoMessageCreate,
    InfoMessageUpdate,
    InfoMessageResponse,
    InfoMessagesListResponse,
    InfoMessagesToggle,
)
from backend.services.channel.info_messages_service import InfoMessagesService

router = APIRouter()


@router.get("/{channel_id}/info-messages", response_model=InfoMessagesListResponse)
async def list_info_messages(
    channel_id: int,
    service: InfoMessagesService = Depends(get_info_messages_service),
    current_user: User = Depends(get_current_user),
):
    return await service.list_messages(channel_id=channel_id, owner_id=current_user.id)


@router.put("/{channel_id}/info-messages/toggle")
async def toggle_info_messages(
    channel_id: int,
    data: InfoMessagesToggle,
    service: InfoMessagesService = Depends(get_info_messages_service),
    current_user: User = Depends(get_current_user),
):
    await service.toggle(channel_id=channel_id, enabled=data.enabled, owner_id=current_user.id)
    return {"ok": True}


@router.post("/{channel_id}/info-messages", response_model=InfoMessageResponse, status_code=201)
async def create_info_message(
    channel_id: int,
    data: InfoMessageCreate,
    service: InfoMessagesService = Depends(get_info_messages_service),
    current_user: User = Depends(get_current_user),
):
    return await service.create_message(channel_id=channel_id, data=data, owner_id=current_user.id)


@router.put("/{channel_id}/info-messages/{message_id}", response_model=InfoMessageResponse)
async def update_info_message(
    channel_id: int,
    message_id: int,
    data: InfoMessageUpdate,
    service: InfoMessagesService = Depends(get_info_messages_service),
    current_user: User = Depends(get_current_user),
):
    return await service.update_message(channel_id=channel_id, message_id=message_id, data=data, owner_id=current_user.id)


@router.delete("/{channel_id}/info-messages/{message_id}", status_code=204)
async def delete_info_message(
    channel_id: int,
    message_id: int,
    service: InfoMessagesService = Depends(get_info_messages_service),
    current_user: User = Depends(get_current_user),
):
    await service.delete_message(channel_id=channel_id, message_id=message_id, owner_id=current_user.id)


@router.post("/{channel_id}/info-messages/{message_id}/share")
async def share_info_message(
    channel_id: int,
    message_id: int,
    service: InfoMessagesService = Depends(get_info_messages_service),
    current_user: User = Depends(get_current_user),
):
    token = await service.generate_share_token(channel_id=channel_id, message_id=message_id, owner_id=current_user.id)
    return {"share_token": token}
