from typing import Optional, Any, Dict, List
from pydantic import BaseModel
from datetime import datetime

from backend.schemas.inbox.enums import InboxCategory, EntityType, EventType, EventStatus, BulkActionType

class InboxEventBase(BaseModel):
    category: InboxCategory
    entity_type: EntityType
    event_type: EventType
    bot_id: Optional[int] = None
    channel_id: Optional[int] = None
    tg_user_id: Optional[int] = None
    tg_username: Optional[str] = None
    status: EventStatus = EventStatus.NEW
    description: Optional[str] = None
    payload: Dict[str, Any] = {}

class InboxEventCreate(InboxEventBase):
    pass

class InboxEventResponse(InboxEventBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_new: bool  # Вычисляемое поле на основе status == NEW

    class Config:
        from_attributes = True

class InboxListResponse(BaseModel):
    items: List[InboxEventResponse]
    total: int

class BulkActionRequest(BaseModel):
    event_ids: List[int] # Пустой список может означать "применить ко всем" если есть флаг
    action: BulkActionType
    apply_to_all: bool = False

# Схема для выполнения специфического действия (Accept, Bar, Reply) над конкретным событием
class SpecificActionRequest(BaseModel):
    action_type: str # "reply", "accept", "reject", "unban", "edit_ban"
    payload: Dict[str, Any] = {} # Данные: текст ответа, срок бана, настройки и тд.
