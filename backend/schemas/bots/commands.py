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
    channel_id: Optional[int] = Field(
        None,
        description="ID группы/супергруппы (channel_groups). Для списка команд конкретного чата.",
    )
    description: Optional[str] = None
    response_text: Optional[str] = None
    response_media_url: Optional[str] = None
    response_media_urls: Optional[List[str]] = None
    response_media_type: Optional[MessageType] = None
    response_buttons: Optional[Dict[str, Any]] = None
    scope: Optional[CommandScope] = None
    is_active: bool = True

    action_type: Optional[str] = Field(default="MESSAGE", description="MESSAGE | CLAIM_ADMIN")
    claim_target: Optional[str] = Field(default=None, description="ADMINS | INBOX | SPECIFIC_CHANNEL")
    claim_channel_ids: Optional[List[int]] = None

class BotCommandUpdate(BaseModel):
    """Схема обновления команды"""
    description: Optional[str] = None
    response_text: Optional[str] = None
    response_media_url: Optional[str] = None
    response_media_urls: Optional[List[str]] = None
    response_media_type: Optional[MessageType] = None
    response_buttons: Optional[Dict[str, Any]] = None
    scope: Optional[CommandScope] = None
    is_active: Optional[bool] = None

    action_type: Optional[str] = None
    claim_target: Optional[str] = None
    claim_channel_ids: Optional[List[int]] = None

class BotCommandResponse(BaseModel):
    """Схема ответа команды"""
    id: int
    bot_id: int
    channel_id: Optional[int] = None
    command: str
    description: Optional[str]
    response_text: Optional[str]
    response_media_url: Optional[str]
    response_media_urls: Optional[List[str]] = None
    response_media_type: Optional[MessageType]
    response_buttons: Optional[Dict[str, Any]]
    scope: Optional[CommandScope]
    is_active: bool
    action_type: Optional[str] = None
    claim_target: Optional[str] = None
    claim_channel_ids: Optional[List[int]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class BotCommandListResponse(BaseModel):
    """Схема списка команд"""
    items: List[BotCommandResponse]
    total: int
