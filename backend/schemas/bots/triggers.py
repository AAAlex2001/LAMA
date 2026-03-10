from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from backend.models.bots import TriggerType, TriggerActionType, TriggerChatType

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
        description="Данные действия: {text, media_url, media_urls, media_type, buttons, duration_minutes}"
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
