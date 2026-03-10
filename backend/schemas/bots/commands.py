from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from backend.models.bots import MessageType, CommandScope

# ============================================================================
# Bot Command Schemas
# ============================================================================

class BotCommandCreate(BaseModel):
    """Схема создания команды"""
    command: str = Field(..., pattern=r"^/[a-zA-Z0-9_]+$", description="Command like /start")
    description: Optional[str] = None
    response_text: str = Field(..., min_length=1)
    response_media_url: Optional[str] = None
    response_media_urls: Optional[List[str]] = None
    response_media_type: Optional[MessageType] = None
    response_buttons: Optional[Dict[str, Any]] = None
    scope: Optional[CommandScope] = None
    is_active: bool = True

class BotCommandUpdate(BaseModel):
    """Схема обновления команды"""
    description: Optional[str] = None
    response_text: Optional[str] = Field(None, min_length=1)
    response_media_url: Optional[str] = None
    response_media_urls: Optional[List[str]] = None
    response_media_type: Optional[MessageType] = None
    response_buttons: Optional[Dict[str, Any]] = None
    scope: Optional[CommandScope] = None
    is_active: Optional[bool] = None

class BotCommandResponse(BaseModel):
    """Схема ответа команды"""
    id: int
    bot_id: int
    command: str
    description: Optional[str]
    response_text: str
    response_media_url: Optional[str]
    response_media_urls: Optional[List[str]] = None
    response_media_type: Optional[MessageType]
    response_buttons: Optional[Dict[str, Any]]
    scope: Optional[CommandScope]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class BotCommandListResponse(BaseModel):
    """Схема списка команд"""
    items: List[BotCommandResponse]
    total: int
