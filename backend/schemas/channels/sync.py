from pydantic import BaseModel
from typing import Optional

from backend.schemas.channels.channel import ChannelGroupResponse


class SyncChannelRequest(BaseModel):
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    invite_link: Optional[str] = None
    bot_id: Optional[int] = None
    token: Optional[str] = None


class SyncChannelResponse(BaseModel):
    success: bool
    channel: Optional[ChannelGroupResponse] = None
    message: str
