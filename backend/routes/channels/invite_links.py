from fastapi import APIRouter, Depends, HTTPException

from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.routes.channels.dependencies import get_channel_service, get_invite_link_service
from backend.schemas.channels import (
    InviteLinkCreate,
    InviteLinkListResponse,
    InviteLinkResponse,
    InviteLinkUpdate,
)
from backend.services.channel.channel_service import ChannelService
from backend.services.channel.invite_link_service import InviteLinkService

router = APIRouter()


@router.get("/{channel_id}/invite-links", response_model=InviteLinkListResponse)
async def list_invite_links(
    channel_id: int,
    service: InviteLinkService = Depends(get_invite_link_service),
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    links = await service.list(channel_id)
    return InviteLinkListResponse(items=links, total=len(links))


@router.post("/{channel_id}/invite-links", response_model=InviteLinkResponse, status_code=201)
async def create_invite_link(
    channel_id: int,
    data: InviteLinkCreate,
    service: InviteLinkService = Depends(get_invite_link_service),
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    link = await service.create(channel, data, current_user.id)
    if not link:
        raise HTTPException(status_code=400, detail="Failed to create invite link")
    return link


@router.get("/{channel_id}/invite-links/{link_id}", response_model=InviteLinkResponse)
async def get_invite_link(
    channel_id: int,
    link_id: int,
    service: InviteLinkService = Depends(get_invite_link_service),
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    link = await service.get(link_id, channel_id)
    if not link:
        raise HTTPException(status_code=404, detail="Invite link not found")
    return link


@router.patch("/{channel_id}/invite-links/{link_id}", response_model=InviteLinkResponse)
async def update_invite_link(
    channel_id: int,
    link_id: int,
    data: InviteLinkUpdate,
    service: InviteLinkService = Depends(get_invite_link_service),
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    link = await service.update(channel, link_id, data)
    if not link:
        raise HTTPException(status_code=404, detail="Invite link not found")
    return link


@router.post("/{channel_id}/invite-links/{link_id}/revoke", response_model=InviteLinkResponse)
async def revoke_invite_link(
    channel_id: int,
    link_id: int,
    service: InviteLinkService = Depends(get_invite_link_service),
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    link = await service.revoke(channel, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Invite link not found")
    return link


@router.delete("/{channel_id}/invite-links/{link_id}")
async def delete_invite_link(
    channel_id: int,
    link_id: int,
    service: InviteLinkService = Depends(get_invite_link_service),
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    success = await service.delete(link_id, channel_id)
    if not success:
        raise HTTPException(status_code=404, detail="Invite link not found")
    return {"success": True, "message": "Invite link deleted"}


@router.post("/{channel_id}/invite-links/sync", response_model=InviteLinkListResponse)
async def sync_invite_links(
    channel_id: int,
    service: InviteLinkService = Depends(get_invite_link_service),
    channel_service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    links = await service.sync(channel)
    return InviteLinkListResponse(items=links, total=len(links))
