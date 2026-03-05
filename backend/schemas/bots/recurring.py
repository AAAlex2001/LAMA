from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field

from backend.models.bots import MessageType, RecurringMessageInterval

# ============================================================================
# Recurring Messages Schemas
# ============================================================================

class RecurringMessageCreate(BaseModel):
    """Создание повторяющегося сообщения"""
    name: str = Field(..., min_length=1, max_length=255)
    text_content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[MessageType] = None
    inline_buttons: Optional[List[List[Dict[str, str]]]] = None
    target_chats: List[int] = Field(..., min_length=1)
    interval_type: RecurringMessageInterval
    interval_value: Optional[int] = Field(None, ge=1)
    time_points: List[str] = Field(..., min_length=1)
    timezone: str = "UTC"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    weekdays: Optional[List[int]] = None
    is_active: bool = True

class RecurringMessageUpdate(BaseModel):
    """Обновление повторяющегося сообщения"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    text_content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[MessageType] = None
    inline_buttons: Optional[List[List[Dict[str, str]]]] = None
    target_chats: Optional[List[int]] = None
    interval_type: Optional[RecurringMessageInterval] = None
    interval_value: Optional[int] = Field(None, ge=1)
    time_points: Optional[List[str]] = None
    timezone: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    weekdays: Optional[List[int]] = None
    is_active: Optional[bool] = None

class RecurringMessageResponse(BaseModel):
    """Ответ повторяющегося сообщения"""
    id: int
    bot_id: int
    name: str
    text_content: Optional[str]
    media_url: Optional[str]
    media_type: Optional[MessageType]
    inline_buttons: Optional[List[List[Dict[str, str]]]]
    target_chats: List[int]
    interval_type: RecurringMessageInterval
    interval_value: Optional[int]
    time_points: List[str]
    timezone: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    weekdays: Optional[List[int]]
    last_sent_at: Optional[datetime]
    next_send_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class RecurringMessageListResponse(BaseModel):
    """Список повторяющихся сообщений"""
    items: List[RecurringMessageResponse]
    total: int
