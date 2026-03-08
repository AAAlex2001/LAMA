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
    is_new: bool

    class Config:
        from_attributes = True

class InboxListResponse(BaseModel):
    items: List[InboxEventResponse]
    total: int

class BulkActionRequest(BaseModel):
    event_ids: List[int]
    action: BulkActionType
    apply_to_all: bool = False

class SpecificActionRequest(BaseModel):
    action_type: str
    payload: Optional[Dict[str, Any]] = None

class SpecificActionResult(BaseModel):
    """Типизированный ответ на выполнение действия над inbox-событием.

    Поле status всегда заполнено. Остальные поля заполняются только
    для соответствующих типов действий:
      - reply: bot_id, tg_user_id, chat_id
      - change_ban: affected_channels
    """
    status: str
    bot_id: Optional[int] = None
    tg_user_id: Optional[int] = None
    chat_id: Optional[int] = None
    affected_channels: Optional[List[int]] = None
