from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.moderation import (
    ChannelModerationRuleCreate,
    ChannelModerationRuleListResponse,
    ChannelModerationRuleResponse,
    ChannelModerationRuleUpdate,
)
from backend.services.channel.features.moderation_rules import (
    CreateModerationRule,
    DeleteModerationRule,
    ListModerationRules,
    UpdateModerationRule,
)

router = APIRouter()


@router.post("/{channel_id}/moderation/rules", response_model=ChannelModerationRuleResponse, status_code=201)
async def create_moderation_rule(
    channel_id: int,
    data: ChannelModerationRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateModerationRule(db).execute(channel_id, current_user.id, data)


@router.get("/{channel_id}/moderation/rules", response_model=ChannelModerationRuleListResponse)
async def list_moderation_rules(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rules = await ListModerationRules(db).execute(channel_id, current_user.id)
    return ChannelModerationRuleListResponse(items=rules, total=len(rules))


@router.put("/{channel_id}/moderation/rules/{rule_id}", response_model=ChannelModerationRuleResponse)
async def update_moderation_rule(
    channel_id: int,
    rule_id: int,
    data: ChannelModerationRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateModerationRule(db).execute(channel_id, rule_id, current_user.id, data)


@router.delete("/{channel_id}/moderation/rules/{rule_id}", status_code=204)
async def delete_moderation_rule(
    channel_id: int,
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteModerationRule(db).execute(channel_id, rule_id, current_user.id)
