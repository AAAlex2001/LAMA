from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class DirectChatWsEvent(BaseModel):
    """WS-событие для direct-чата."""
    user_id: int
    bot_id: int
    chat_id: int
    event_type: str
    payload: dict

class DirectChatBase(BaseModel):
    is_pinned: bool = False
    is_blocked: bool = False

class DirectChatCreate(DirectChatBase):
    """Идемпотентное создание DM-чата по (bot_id, tg_chat_id)."""

    bot_id: int
    tg_chat_id: int
    tg_user_id: Optional[int] = None
    tg_username: Optional[str] = None
    tg_first_name: Optional[str] = None
    tg_last_name: Optional[str] = None

class DirectChatUpdate(BaseModel):
    """Частичный апдейт: pin/block/unread/профиль."""

    unread_count: Optional[int] = None
    is_pinned: Optional[bool] = None
    is_blocked: Optional[bool] = None
    tg_username: Optional[str] = None
    tg_first_name: Optional[str] = None
    tg_last_name: Optional[str] = None

class DirectChatResponse(DirectChatBase):
    """DM-чат: профиль собеседника + preview + counters."""

    id: int
    bot_id: int
    tg_chat_id: int
    tg_user_id: Optional[int] = None
    tg_username: Optional[str] = None
    tg_first_name: Optional[str] = None
    tg_last_name: Optional[str] = None
    tg_photo_url: Optional[str] = None
    unread_count: int
    created_at: datetime
    updated_at: datetime

    bot_username: Optional[str] = None
    bot_first_name: Optional[str] = None
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class DirectChatListResponse(BaseModel):
    """Список DM-чатов + total + page + page_size."""

    items: List[DirectChatResponse]
    total: int
    page: int
    page_size: int
