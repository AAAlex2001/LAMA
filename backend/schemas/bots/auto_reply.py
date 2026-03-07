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
    response_media_type: Optional[MessageType] = None
    response_buttons: Optional[Dict[str, Any]] = None
    scope: Optional[CommandScope] = None
    is_active: bool = True

class AutoReplyUpdate(BaseModel):
    """Схема обновления автоответа"""
    keywords: Optional[List[str]] = Field(None, min_length=1)
    response_text: Optional[str] = Field(None, min_length=1)
    response_media_url: Optional[str] = None
    response_media_type: Optional[MessageType] = None
    response_buttons: Optional[Dict[str, Any]] = None
    scope: Optional[CommandScope] = None
    is_active: Optional[bool] = None

class AutoReplyResponse(BaseModel):
    """Схема ответа автоответа"""
    id: int
    bot_id: int
    keywords: List[str]
    response_text: str
    response_media_url: Optional[str]
    response_media_type: Optional[MessageType]
    response_buttons: Optional[Dict[str, Any]]
    scope: Optional[CommandScope]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class AutoReplyListResponse(BaseModel):
    """Схема списка автоответов"""
    items: List[AutoReplyResponse]
    total: int
