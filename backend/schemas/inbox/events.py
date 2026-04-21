from typing import Optional, Any, Dict, List
from pydantic import BaseModel, model_validator
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
    updated_at: Optional[datetime] = None
    is_new: bool
    tg_bot_username: Optional[str] = None
    tg_bot_name: Optional[str] = None
    reason: Optional[str] = None
    reason_source: Optional[str] = None
    trigger_names: Optional[List[str]] = None

    @model_validator(mode="after")
    def populate_derived_fields(self):
        payload = self.payload if isinstance(self.payload, dict) else {}

        if self.trigger_names is None:
            raw_trigger_names = payload.get("trigger_names")
            if isinstance(raw_trigger_names, list):
                trigger_names = [
                    str(item).strip()
                    for item in raw_trigger_names
                    if str(item).strip()
                ]
                self.trigger_names = trigger_names or None

        if self.reason is None:
            for key in ("reason", "block_reason", "trigger_reason"):
                value = payload.get(key)
                if isinstance(value, str) and value.strip():
                    self.reason = value.strip()
                    break

            if self.reason is None and self.trigger_names:
                prefix = "Сработал триггер" if len(self.trigger_names) == 1 else "Сработали триггеры"
                self.reason = f"{prefix}: {', '.join(self.trigger_names)}"

            if self.reason is None and self.event_type in (EventType.CHANNEL_BAN, EventType.SYSTEM_TRIGGER) and self.description:
                self.reason = self.description

        if self.reason_source is None:
            raw_source = payload.get("reason_source")
            if isinstance(raw_source, str) and raw_source.strip():
                self.reason_source = raw_source.strip()
        return self

    class Config:
        from_attributes = True

class InboxListResponse(BaseModel):
    items: List[InboxEventResponse]
    total: int
    has_more: bool = False

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
      - reply: bot_id, tg_user_id, chat_id, message_id
      - change_ban: affected_channels
    """
    status: str
    bot_id: Optional[int] = None
    tg_user_id: Optional[int] = None
    chat_id: Optional[int] = None
    message_id: Optional[int] = None
    affected_channels: Optional[List[int]] = None
