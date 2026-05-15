from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class InfoMessageCreate(BaseModel):
    text: str = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    media_urls: Optional[List[str]] = None
    inline_keyboard: Optional[list] = None


class InfoMessageUpdate(BaseModel):
    text: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    media_urls: Optional[List[str]] = None
    inline_keyboard: Optional[list] = None
    is_enabled: Optional[bool] = None


class InfoMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel_id: int
    text: str
    media_url: Optional[str]
    media_type: Optional[str]
    media_urls: Optional[List[str]] = None
    inline_keyboard: Optional[list]
    is_enabled: bool
    share_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class InfoMessagesListResponse(BaseModel):
    enabled: bool
    auto_reply_enabled: bool
    items: list[InfoMessageResponse]


class InfoMessagesToggle(BaseModel):
    enabled: bool


class AutoReplyToggle(BaseModel):
    enabled: bool
