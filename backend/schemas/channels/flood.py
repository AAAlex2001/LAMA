from pydantic import BaseModel, Field
from typing import Optional

from backend.models.channels import ActionType


class FloodSettingsUpdate(BaseModel):
    flood_message_limit: Optional[int] = Field(None, ge=1)
    flood_interval_seconds: Optional[int] = Field(None, ge=1)
    flood_action: Optional[ActionType] = None
    flood_mute_duration_minutes: Optional[int] = Field(None, ge=1)


class FloodSettingsResponse(BaseModel):
    flood_message_limit: Optional[int]
    flood_interval_seconds: Optional[int]
    flood_action: Optional[ActionType]
    flood_mute_duration_minutes: Optional[int]
