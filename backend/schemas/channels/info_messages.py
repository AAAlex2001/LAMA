from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class InfoMessageCreate(BaseModel):
    text: str = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    inline_keyboard: Optional[list] = None


class InfoMessageUpdate(BaseModel):
    text: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    inline_keyboard: Optional[list] = None


class InfoMessageResponse(BaseModel):
    id: int
    channel_id: int
    text: str
    media_url: Optional[str]
    media_type: Optional[str]
    inline_keyboard: Optional[list]
    is_enabled: bool
    share_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InfoMessagesListResponse(BaseModel):
    enabled: bool
    items: list[InfoMessageResponse]


class InfoMessagesToggle(BaseModel):
    enabled: bool
