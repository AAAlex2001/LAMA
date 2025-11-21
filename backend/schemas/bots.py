"""
Схемы для работы с ботами
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator

from backend.models.bots import BotStatus, ApprovalMode, MessageType, CommandScope


# ============================================================================
# Bot Schemas
# ============================================================================

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


class SyncBotResponse(BaseModel):
    """Схема ответа синхронизации бота"""
    success: bool
    bot: BotResponse
    message: str


# ============================================================================
# Welcome Settings Schemas
# ============================================================================

class WelcomeSettingsUpdate(BaseModel):
    """Схема обновления настроек приветствия"""
    welcome_enabled: bool = False
    welcome_message: Optional[str] = None
    welcome_media_url: Optional[str] = None
    welcome_media_type: Optional[MessageType] = None
    welcome_buttons: Optional[Dict[str, Any]] = None
    # Флаг: при заявке отправлять капчу (в MANUAL-режиме)
    join_captcha_enabled: Optional[bool] = None


class WelcomeSettingsResponse(BaseModel):
    """Схема ответа настроек приветствия"""
    welcome_enabled: bool
    welcome_message: Optional[str]
    welcome_media_url: Optional[str]
    welcome_media_type: Optional[MessageType]
    welcome_buttons: Optional[Dict[str, Any]]
    join_captcha_enabled: bool

    model_config = {"from_attributes": True}


# ============================================================================
# Auto Approval Schemas
# ============================================================================

class AutoApprovalUpdate(BaseModel):
    """Схема обновления настроек автоодобрения"""
    auto_approval_mode: ApprovalMode
    approval_criteria: Optional[Dict[str, Any]] = None

    @field_validator("approval_criteria")
    @classmethod
    def validate_criteria(cls, v, info):
        """Валидация критериев"""
        mode = info.data.get("auto_approval_mode")
        if mode == ApprovalMode.CRITERIA and not v:
            raise ValueError("Criteria required for CRITERIA mode")
        return v


class AutoApprovalResponse(BaseModel):
    """Схема ответа настроек автоодобрения"""
    auto_approval_mode: ApprovalMode
    approval_criteria: Optional[Dict[str, Any]]

    model_config = {"from_attributes": True}


# ============================================================================
# Bot Message Schemas
# ============================================================================

class SendMessageRequest(BaseModel):
    """Схема запроса отправки сообщения"""
    chat_id: int
    text_content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[MessageType] = None
    buttons: Optional[Dict[str, Any]] = None


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
    is_incoming: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class BotMessageListResponse(BaseModel):
    """Схема списка сообщений бота"""
    items: List[BotMessageResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ============================================================================
# Bot Command Schemas
# ============================================================================

class BotCommandCreate(BaseModel):
    """Схема создания команды"""
    command: str = Field(..., pattern=r"^/[a-zA-Z0-9_]+$", description="Command like /start")
    description: Optional[str] = None
    response_text: str = Field(..., min_length=1)
    response_media_url: Optional[str] = None
    response_media_type: Optional[MessageType] = None
    response_buttons: Optional[Dict[str, Any]] = None
    scope: Optional[CommandScope] = None  # Область работы команды (PRIVATE, GROUPS, ALL)
    is_active: bool = True


class BotCommandUpdate(BaseModel):
    """Схема обновления команды"""
    description: Optional[str] = None
    response_text: Optional[str] = Field(None, min_length=1)
    response_media_url: Optional[str] = None
    response_media_type: Optional[MessageType] = None
    response_buttons: Optional[Dict[str, Any]] = None
    scope: Optional[CommandScope] = None  # Область работы команды (PRIVATE, GROUPS, ALL)
    is_active: Optional[bool] = None


class BotCommandResponse(BaseModel):
    """Схема ответа команды"""
    id: int
    bot_id: int
    command: str
    description: Optional[str]
    response_text: str
    response_media_url: Optional[str]
    response_media_type: Optional[MessageType]
    response_buttons: Optional[Dict[str, Any]]
    scope: Optional[CommandScope]  # Область работы команды (PRIVATE, GROUPS, ALL)
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BotCommandListResponse(BaseModel):
    """Схема списка команд"""
    items: List[BotCommandResponse]
    total: int


# ============================================================================
# Bot Stats Schemas
# ============================================================================

class BotStatsResponse(BaseModel):
    """Схема статистики бота"""
    bot_id: int
    total_messages: int
    incoming_messages: int
    outgoing_messages: int
    total_commands: int
    active_commands: int
    last_message_at: Optional[datetime]
