from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

from backend.models.channels import ActionType


class ChannelModerationRuleCreate(BaseModel):
    action: ActionType
    phrase: str
    mute_duration_minutes: Optional[int] = None


class ChannelModerationRuleUpdate(BaseModel):
    action: Optional[ActionType] = None
    phrase: Optional[str] = None
    mute_duration_minutes: Optional[int] = None


class ChannelModerationRuleResponse(BaseModel):
    id: int
    channel_id: int
    action: ActionType
    phrase: str
    mute_duration_minutes: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChannelModerationRuleListResponse(BaseModel):
    items: List[ChannelModerationRuleResponse]
    total: int
