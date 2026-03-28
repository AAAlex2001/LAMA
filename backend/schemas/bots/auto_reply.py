from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from backend.models.bots import MessageType, CommandScope

# ============================================================================
# Auto Reply Schemas
# ============================================================================

class AutoReplyCreate(BaseModel):
    """Схема создания автоответа"""
    keywords: List[str] = Field(..., min_length=1, description="List of keywords to trigger auto-reply")
    response_text: str = Field(..., min_length=1)
    response_media_url: Optional[str] = None
    response_media_urls: Optional[List[str]] = None
    response_media_type: Optional[MessageType] = None
    response_buttons: Optional[Dict[str, Any]] = None
    scope: Optional[CommandScope] = None
    is_active: bool = True
    frequency_limit_minutes: Optional[int] = Field(None, ge=1, le=1440)
    frequency_limit_type: Optional[str] = None  # 'per_user' | 'per_group'
    channel_id: Optional[int] = None

class AutoReplyUpdate(BaseModel):
    """Схема обновления автоответа"""
    keywords: Optional[List[str]] = Field(None, min_length=1)
    response_text: Optional[str] = Field(None, min_length=1)
    response_media_url: Optional[str] = None
    response_media_urls: Optional[List[str]] = None
    response_media_type: Optional[MessageType] = None
    response_buttons: Optional[Dict[str, Any]] = None
    scope: Optional[CommandScope] = None
    is_active: Optional[bool] = None
    frequency_limit_minutes: Optional[int] = Field(None, ge=1, le=1440)
    frequency_limit_type: Optional[str] = None  # 'per_user' | 'per_group'

class AutoReplyResponse(BaseModel):
    """Схема ответа автоответа"""
    id: int
    bot_id: int
    channel_id: Optional[int] = None
    keywords: List[str]
    response_text: str
    response_media_url: Optional[str]
    response_media_urls: Optional[List[str]] = None
    response_media_type: Optional[MessageType]
    response_buttons: Optional[Dict[str, Any]]
    scope: Optional[CommandScope]
    is_active: bool
    frequency_limit_minutes: Optional[int] = None
    frequency_limit_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class AutoReplyListResponse(BaseModel):
    """Схема списка автоответов"""
    items: List[AutoReplyResponse]
    total: int
