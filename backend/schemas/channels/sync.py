from pydantic import BaseModel
from typing import Optional

from backend.schemas.channels.channel import ChannelGroupResponse


class SyncChannelRequest(BaseModel):
    """Запрос синхронизации канала через bot.get_chat."""

    telegram_id: Optional[int] = None
    username: Optional[str] = None
    invite_link: Optional[str] = None
    bot_id: Optional[int] = None
    token: Optional[str] = None


class SyncChannelResponse(BaseModel):
    """Результат синка: список изменённых полей."""

    success: bool
    channel: Optional[ChannelGroupResponse] = None
    message: str
