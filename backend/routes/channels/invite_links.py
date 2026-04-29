from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels import (
    InviteLinkCreate,
    InviteLinkListResponse,
    InviteLinkResponse,
    InviteLinkUpdate,
)
from backend.services.channel.features.invite_links import (
    CreateInviteLink,
    DeleteInviteLink,
    ListInviteLinks,
    RefreshInviteLink,
    RevokeInviteLink,
    SyncInviteLinks,
    UpdateInviteLink,
    find_invite_link_or_404,
)
from backend.services.channel.utils.query_utils import find_channel_or_404

router = APIRouter()


@router.get("/{channel_id}/invite-links", response_model=InviteLinkListResponse)
async def list_invite_links(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    links = await ListInviteLinks(db).execute(channel_id)
    return InviteLinkListResponse(items=links, total=len(links))


@router.post("/{channel_id}/invite-links", response_model=InviteLinkResponse, status_code=201)
async def create_invite_link(
    channel_id: int,
    data: InviteLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id, load_bot=True)
    return await CreateInviteLink(db).execute(channel, data, current_user.id)


@router.get("/{channel_id}/invite-links/{link_id}", response_model=InviteLinkResponse)
async def get_invite_link(
    channel_id: int,
    link_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id, load_bot=True)
    link = await find_invite_link_or_404(db, link_id, channel_id)
    return await RefreshInviteLink(db).execute(channel, link)


@router.patch("/{channel_id}/invite-links/{link_id}", response_model=InviteLinkResponse)
async def update_invite_link(
    channel_id: int,
    link_id: int,
    data: InviteLinkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id, load_bot=True)
    return await UpdateInviteLink(db).execute(channel, link_id, data)


@router.post("/{channel_id}/invite-links/{link_id}/revoke", response_model=InviteLinkResponse)
async def revoke_invite_link(
    channel_id: int,
    link_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id, load_bot=True)
    return await RevokeInviteLink(db).execute(channel, link_id)


@router.delete("/{channel_id}/invite-links/{link_id}")
async def delete_invite_link(
    channel_id: int,
    link_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    await DeleteInviteLink(db).execute(link_id, channel_id)
    return {"success": True, "message": "Invite link deleted"}


@router.post("/{channel_id}/invite-links/sync", response_model=InviteLinkListResponse)
async def sync_invite_links(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id, load_bot=True)
    links = await SyncInviteLinks(db).execute(channel)
    return InviteLinkListResponse(items=links, total=len(links))
