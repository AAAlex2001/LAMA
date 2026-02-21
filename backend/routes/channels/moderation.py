from fastapi import APIRouter, Depends, HTTPException

from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.routes.channels.dependencies import get_moderation_service
from backend.schemas.channels import (
    ChannelModerationRuleCreate,
    ChannelModerationRuleListResponse,
    ChannelModerationRuleResponse,
    ChannelModerationRuleUpdate,
)
from backend.services.channel.moderation_service import ModerationService

router = APIRouter()


@router.post("/{channel_id}/moderation/rules", response_model=ChannelModerationRuleResponse, status_code=201)
async def create_moderation_rule(
    channel_id: int,
    data: ChannelModerationRuleCreate,
    service: ModerationService = Depends(get_moderation_service),
    current_user: User = Depends(get_current_user),
):
    try:
        return await service.create_rule(channel_id=channel_id, data=data, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{channel_id}/moderation/rules", response_model=ChannelModerationRuleListResponse)
async def list_moderation_rules(
    channel_id: int,
    service: ModerationService = Depends(get_moderation_service),
    current_user: User = Depends(get_current_user),
):
    try:
        rules = await service.list_rules(channel_id=channel_id, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return ChannelModerationRuleListResponse(items=rules, total=len(rules))


@router.put("/{channel_id}/moderation/rules/{rule_id}", response_model=ChannelModerationRuleResponse)
async def update_moderation_rule(
    channel_id: int,
    rule_id: int,
    data: ChannelModerationRuleUpdate,
    service: ModerationService = Depends(get_moderation_service),
    current_user: User = Depends(get_current_user),
):
    rule = await service.update_rule(channel_id=channel_id, rule_id=rule_id, data=data, owner_id=current_user.id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.delete("/{channel_id}/moderation/rules/{rule_id}", status_code=204)
async def delete_moderation_rule(
    channel_id: int,
    rule_id: int,
    service: ModerationService = Depends(get_moderation_service),
    current_user: User = Depends(get_current_user),
):
    success = await service.delete_rule(channel_id=channel_id, rule_id=rule_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")
