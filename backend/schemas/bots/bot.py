from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator

from backend.models.bots import BotStatus, ApprovalMode, MessageType, CommandScope, TriggerType, TriggerActionType, CaptchaMode, TriggerChatType, RecurringMessageInterval

# Bot Schemas

class BotBase(BaseModel):
    """Базовая схема бота"""
    description: Optional[str] = None
    short_description: Optional[str] = None
    photo_url: Optional[str] = None
    status: BotStatus = BotStatus.ACTIVE
    is_webhook_enabled: bool = False
    webhook_url: Optional[str] = None

class BotCreate(BaseModel):
    """Схема создания бота"""
    token: str = Field(..., min_length=10, description="Telegram Bot Token")
    description: Optional[str] = None

class BotUpdate(BaseModel):
    """Схема обновления бота"""
    name: Optional[str] = Field(None, max_length=64, description="Отображаемое имя бота")
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=120, description="Короткое описание бота")
    photo_url: Optional[str] = None
    status: Optional[BotStatus] = None
    is_webhook_enabled: Optional[bool] = None
    webhook_url: Optional[str] = None

class BotResponse(BaseModel):
    """Схема ответа с данными бота"""
    id: int
    telegram_id: int
    username: str
    first_name: str
    description: Optional[str]
    short_description: Optional[str]
    photo_url: Optional[str]
    status: BotStatus
    is_webhook_enabled: bool
    webhook_url: Optional[str]
    welcome_enabled: bool
    auto_approval_mode: ApprovalMode
    captcha_mode: CaptchaMode
    captcha_timeout_seconds: int
    last_sync_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class BotListResponse(BaseModel):
    """Схема списка ботов"""
    items: List[BotResponse]
    total: int
    page: int
    page_size: int
    pages: int

class SyncBotRequest(BaseModel):
    """Схема запроса синхронизации бота"""
    token: str = Field(..., min_length=10)
    description: Optional[str] = None

class SyncBotResponse(BaseModel):
    """Схема ответа синхронизации бота"""
    success: bool
    bot: BotResponse
    message: str

class BotStatsResponse(BaseModel):
    """Схема статистики бота"""
    bot_id: int
    total_messages: int
    incoming_messages: int
    outgoing_messages: int
    total_commands: int
    active_commands: int
    last_message_at: Optional[datetime]
