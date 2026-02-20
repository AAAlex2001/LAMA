from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, Field, ConfigDict

from backend.schemas.publications.common import InlineKeyboard


class EditPublishedRequest(BaseModel):
    text_content: Optional[str] = Field(None, min_length=1)
    media_urls: Optional[List[str]] = None
    inline_keyboard: Optional[InlineKeyboard] = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    publication_id: int
    status: str
    message: str
    error_details: Optional[dict[str, Any]]
    created_at: datetime


class TelegramMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    publication_id: int
    channel_id: int
    telegram_message_id: int
    published_at: datetime


class ChannelPublishResult(BaseModel):
    channel: str
    success: bool
    error: Optional[str] = None
    message_ids: Optional[List[int]] = None
    replied_to: Optional[int] = None
    telegram_messages_data: Optional[List[dict[str, Any]]] = None
    sent_messages: Optional[Any] = None
    channel_obj: Optional[Any] = None
    notification_error: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True


class PublishResult(BaseModel):
    success: bool
    results: List[ChannelPublishResult]
    success_count: int
    total_count: int
    publication_id: Optional[int] = None
    error: Optional[str] = None


class EditMessageResult(BaseModel):
    success: bool
    results: List[ChannelPublishResult]
    success_count: int
    total_count: int
    error: Optional[str] = None


class DeleteMessageResult(BaseModel):
    success: bool
    results: List[ChannelPublishResult]
    success_count: int
    total_count: int
    error: Optional[str] = None
