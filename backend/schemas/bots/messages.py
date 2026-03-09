from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from backend.models.bots import MessageType

# ============================================================================
# Bot Message Schemas
# ============================================================================

class SendMessageRequest(BaseModel):
    """Схема запроса отправки сообщения"""
    chat_id: int
    text_content: Optional[str] = None
    media_url: Optional[str] = None
    media_urls: Optional[List[str]] = None
    media_type: Optional[MessageType] = None
    buttons: Optional[Dict[str, Any]] = None
    reply_to_message_id: Optional[int] = None

class BotMessageResponse(BaseModel):
    """Схема ответа сообщения бота"""
    id: int
    bot_id: int
    telegram_message_id: int
    chat_id: int
    user_id: Optional[int]
    message_type: MessageType
    text_content: Optional[str]
    media_file_id: Optional[str]
    media_url: Optional[str]
    media_group_id: Optional[str] = None
    media_name: Optional[str] = None
    media_size: Optional[int] = None
    reply_to_message_id: Optional[int] = None
    is_incoming: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class BotMessageBatchResponse(BaseModel):
    """Схема ответа пакетной отправки сообщений бота"""
    items: List[BotMessageResponse]

class BotMessageListResponse(BaseModel):
    """Схема списка сообщений бота"""
    items: List[BotMessageResponse]
    total: int
    page: int
    page_size: int
    pages: int
