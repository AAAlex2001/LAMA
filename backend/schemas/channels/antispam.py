from pydantic import BaseModel
from typing import Optional, List

from backend.models.channels import ActionType, LinkFilterMode


class AntispamSettingsUpdate(BaseModel):
    link_filter_mode: Optional[LinkFilterMode] = None
    link_whitelist: Optional[List[str]] = None
    link_blacklist: Optional[List[str]] = None
    link_filter_action: Optional[ActionType] = None
    link_filter_mute_duration: Optional[int] = None


class AntispamSettingsResponse(BaseModel):
    link_filter_mode: LinkFilterMode
    link_whitelist: Optional[List[str]]
    link_blacklist: Optional[List[str]]
    link_filter_action: ActionType
    link_filter_mute_duration: Optional[int]
