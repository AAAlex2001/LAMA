from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class DirectChatBase(BaseModel):
    is_pinned: bool = False
    is_blocked: bool = False

class DirectChatCreate(DirectChatBase):
    bot_id: int
    tg_chat_id: int
    tg_user_id: Optional[int] = None
    tg_username: Optional[str] = None
    tg_first_name: Optional[str] = None
    tg_last_name: Optional[str] = None

class DirectChatUpdate(BaseModel):
    unread_count: Optional[int] = None
    is_pinned: Optional[bool] = None
    is_blocked: Optional[bool] = None
    tg_username: Optional[str] = None
    tg_first_name: Optional[str] = None
    tg_last_name: Optional[str] = None

class DirectChatResponse(DirectChatBase):
    id: int
    bot_id: int
    tg_chat_id: int
    tg_user_id: Optional[int] = None
    tg_username: Optional[str] = None
    tg_first_name: Optional[str] = None
    tg_last_name: Optional[str] = None
    unread_count: int
    created_at: datetime
    updated_at: datetime
    
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class DirectChatListResponse(BaseModel):
    items: List[DirectChatResponse]
    total: int
    page: int
    page_size: int
