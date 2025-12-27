"""
Схемы для работы с ботами
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator

from backend.models.bots import BotStatus, ApprovalMode, MessageType, CommandScope, TriggerType, TriggerActionType, CaptchaMode, TriggerChatType, RecurringMessageInterval


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


class SyncBotResponse(BaseModel):
    """Схема ответа синхронизации бота"""
    success: bool
    bot: BotResponse
    message: str




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
# Welcome Settings Schemas
# ============================================================================

class WelcomeSettingsUpdate(BaseModel):
    """Схема обновления настроек приветствия"""
    welcome_enabled: bool = False
    welcome_message: Optional[str] = None
    welcome_media_url: Optional[str] = None
    welcome_media_type: Optional[MessageType] = None
    welcome_buttons: Optional[Dict[str, Any]] = None
    welcome_message_thread_id: Optional[int] = None  # ID топика для групповых приветствий
    # Флаг: при заявке отправлять капчу (в MANUAL-режиме) - DEPRECATED
    join_captcha_enabled: Optional[bool] = None
    captcha_mode: Optional[CaptchaMode] = None
    captcha_timeout_seconds: Optional[int] = Field(None, ge=5, le=300, description="Таймаут капчи в группе (5-300 секунд)")


class WelcomeSettingsResponse(BaseModel):
    """Схема ответа настроек приветствия"""
    welcome_enabled: bool
    welcome_message: Optional[str]
    welcome_media_url: Optional[str]
    welcome_media_type: Optional[MessageType]
    welcome_buttons: Optional[Dict[str, Any]]
    welcome_message_thread_id: Optional[int]
    join_captcha_enabled: bool  # DEPRECATED
    captcha_mode: CaptchaMode
    captcha_timeout_seconds: int

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


# ============================================================================
# Trigger Schemas
# ============================================================================

class TriggerCreate(BaseModel):
    """Схема создания триггера"""
    name: str = Field(..., min_length=1, max_length=255, description="Название триггера")
    trigger_type: TriggerType = Field(..., description="Тип события")
    action_type: TriggerActionType = Field(..., description="Тип действия")
    action_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Данные действия: {text, media_url, media_type, buttons, duration_minutes}"
    )
    delay_minutes: int = Field(0, ge=0, description="Задержка в минутах (0 = сразу)")
    delivery_window: Optional[Dict[str, Any]] = Field(
        None,
        description="Окно доставки: {start_hour, end_hour, timezone}"
    )
    filters: Optional[Dict[str, Any]] = Field(
        None,
        description="Фильтры: {chat_ids: [...], user_ids: [...]}"
    )
    chat_type: TriggerChatType = Field(
        TriggerChatType.BOTH,
        description="Где срабатывает триггер: PRIVATE (ЛС), GROUP (группа), BOTH (оба)"
    )
    is_active: bool = True


class TriggerUpdate(BaseModel):
    """Схема обновления триггера"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    trigger_type: Optional[TriggerType] = None
    action_type: Optional[TriggerActionType] = None
    action_data: Optional[Dict[str, Any]] = None
    delay_minutes: Optional[int] = Field(None, ge=0)
    delivery_window: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    chat_type: Optional[TriggerChatType] = None
    is_active: Optional[bool] = None


class TriggerResponse(BaseModel):
    """Схема ответа триггера"""
    id: int
    bot_id: int
    name: str
    trigger_type: TriggerType
    action_type: TriggerActionType
    action_data: Optional[Dict[str, Any]]
    delay_minutes: int
    delivery_window: Optional[Dict[str, Any]]
    filters: Optional[Dict[str, Any]]
    chat_type: TriggerChatType
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TriggerListResponse(BaseModel):
    """Схема списка триггеров"""
    items: List[TriggerResponse]
    total: int


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
