from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, ConfigDict

from backend.schemas.publications.enums import (
    ContentType,
    PublicationStatus,
    RepeatInterval,
    RepeatCustomUnit,
)
from backend.schemas.publications.common import ChannelResponse
from backend.schemas.publications.tags import TagResponse
from backend.schemas.publications.series import PublicationSeriesResponse


class ChannelCompact(BaseModel):
    """Lightweight channel info for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    members_count: Optional[int] = None
    photo_url: Optional[str] = None


class TagCompact(BaseModel):
    """Lightweight tag info for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: Optional[str] = None


class PublicationCompact(BaseModel):
    """Lightweight publication for calendar/drafts/list views."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_type: ContentType
    status: PublicationStatus
    text_content: Optional[str] = None
    formatted_content: Optional[dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
    media_thumbnail_urls: Optional[List[Optional[str]]] = None
    media_file_ids: Optional[List[Optional[str]]] = None
    media_blur: Optional[List[bool]] = None
    inline_keyboard: Optional[dict[str, Any]] = None
    poll_data: Optional[dict[str, Any]] = None
    scheduled_time: Optional[datetime] = None
    published_time: Optional[datetime] = None
    repeat_interval: RepeatInterval = RepeatInterval.NEVER
    created_at: datetime
    updated_at: datetime
    channels: List[ChannelCompact] = []
    tags: List[TagCompact] = []


class PublicationCompactListResponse(BaseModel):
    items: List[PublicationCompact]
    page: int
    page_size: int


class PublicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_type: ContentType
    status: PublicationStatus
    text_content: Optional[str] = None
    formatted_content: Optional[dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
    media_thumbnail_urls: Optional[List[Optional[str]]] = None
    media_file_ids: Optional[List[Optional[str]]] = None
    media_blur: Optional[List[bool]] = None
    inline_keyboard: Optional[dict[str, Any]] = None
    poll_data: Optional[dict[str, Any]] = None
    pin_message: bool = False
    disable_notification: bool = False
    disable_web_page_preview: bool = True
    auto_delete_hours: Optional[int] = None
    auto_delete_delay_seconds: Optional[int] = None
    scheduled_time: Optional[datetime] = None
    timezone: str = "UTC"
    series_id: Optional[int] = None
    series_order: Optional[int] = None
    reply_to_post_id: Optional[int] = None
    ai_generated: bool
    ai_prompt: Optional[str] = None
    published_time: Optional[datetime] = None
    repeat_interval: RepeatInterval = RepeatInterval.NEVER
    repeat_custom_days: Optional[int] = None
    repeat_custom_hours: Optional[int] = None
    repeat_custom_unit: Optional[RepeatCustomUnit] = None
    repeat_custom_value: Optional[int] = None
    repeat_weekdays: Optional[List[int]] = None
    repeat_month_days: Optional[List[int]] = None
    repeat_year_month: Optional[int] = None
    repeat_year_days: Optional[List[int]] = None
    next_repeat_time: Optional[datetime] = None
    repeat_end_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    share_token: Optional[str] = None
    share_token_expires_at: Optional[datetime] = None
    share_token_used: bool = False
    channels: List[ChannelResponse] = []
    tags: List[TagResponse] = []
    series: Optional[PublicationSeriesResponse] = None


class PublicationPreview(BaseModel):
    text: str
    media_preview: Optional[List[str]] = None
    keyboard_preview: Optional[str] = None
    poll_preview: Optional[str] = None


class DayCount(BaseModel):
    date: str
    count: int
