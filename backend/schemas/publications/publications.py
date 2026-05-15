from datetime import datetime
from decimal import Decimal
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator, model_validator

from backend.schemas.publications.common import ChannelResponse, InlineKeyboard, PollData
from backend.schemas.publications.enums import (
    ContentType,
    PublicationStatus,
    RepeatCustomUnit,
    RepeatInterval,
)
from backend.schemas.publications.series import PublicationSeriesResponse
from backend.schemas.publications.tags import TagResponse


class PublicationBase(BaseModel):
    """Базовая схема публикации со всеми полями контента/расписания/повторений."""

    content_type: ContentType
    text_content: Optional[str] = None
    formatted_content: Optional[dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
    media_thumbnail_urls: Optional[List[Optional[str]]] = None
    media_file_ids: Optional[List[Optional[str]]] = None
    media_blur: Optional[List[bool]] = None
    inline_keyboard: Optional[InlineKeyboard] = None
    poll_data: Optional[PollData] = None
    pin_message: bool = False
    disable_notification: bool = False
    disable_web_page_preview: bool = True
    reply_to_post_id: Optional[int] = None
    auto_delete_hours: Optional[int] = Field(None, gt=0)
    auto_delete_delay_seconds: Optional[int] = Field(None, gt=0)
    repeat_interval: RepeatInterval = RepeatInterval.NEVER
    repeat_custom_days: Optional[int] = Field(None, ge=0)
    repeat_custom_hours: Optional[int] = Field(None, ge=0)
    repeat_custom_unit: Optional[RepeatCustomUnit] = None
    repeat_custom_value: Optional[int] = Field(None, ge=1)
    repeat_weekdays: Optional[List[int]] = None
    repeat_month_days: Optional[List[int]] = None
    repeat_year_month: Optional[int] = Field(None, ge=1, le=12)
    repeat_year_days: Optional[List[int]] = None
    repeat_end_time: Optional[datetime] = None
    scheduled_time: Optional[datetime] = None
    timezone: str = "UTC"
    series_id: Optional[int] = None
    series_order: Optional[int] = None
    ai_prompt: Optional[str] = None
    is_ad: bool = False
    ad_buyer: Optional[str] = None
    ad_amount: Optional[Decimal] = None
    ad_currency: Optional[str] = None
    ad_note: Optional[str] = None
    channel_ids: List[int] = Field(default_factory=list)
    tag_names: List[str] = Field(default_factory=list)
    tag_color: Optional[str] = None
    tag_colors: Optional[List[str]] = None

    @model_validator(mode="after")
    def validate_content_payload(self):
        has_text = bool(self.text_content and self.text_content.strip())
        has_media = bool(self.media_urls)

        if self.content_type == ContentType.TEXT and not has_text:
            raise ValueError("text_content is required for text publications")
        if self.content_type == ContentType.TEXT_WITH_MEDIA and not (has_text or has_media):
            raise ValueError("text_content or media_urls required for text_with_media")
        media_types = {ContentType.IMAGE, ContentType.VIDEO, ContentType.AUDIO, ContentType.DOCUMENT}
        if self.content_type in media_types and not has_media:
            raise ValueError(f"media_urls is required for {self.content_type.value} publications")
        return self

    @model_validator(mode="after")
    def validate_auto_delete(self):
        if self.auto_delete_hours is not None and self.auto_delete_delay_seconds is not None:
            raise ValueError("Provide either auto_delete_hours or auto_delete_delay_seconds, not both")
        return self

    @model_validator(mode="after")
    def validate_repeat_end_time(self):
        if self.repeat_end_time and self.scheduled_time and self.repeat_end_time < self.scheduled_time:
            raise ValueError("repeat_end_time cannot be earlier than scheduled_time")
        return self

    @field_validator("poll_data")
    @classmethod
    def validate_poll_data(cls, value, info: ValidationInfo):
        content_type = info.data.get("content_type")
        if content_type in (ContentType.POLL, ContentType.QUIZ):
            if value is None:
                raise ValueError("poll_data is required for polls and quizzes")
            if content_type == ContentType.QUIZ and value.correct_option_id is None:
                raise ValueError("correct_option_id is required for quizzes")
        return value

    @field_validator("repeat_weekdays")
    @classmethod
    def validate_repeat_weekdays(cls, value):
        if value is None:
            return value
        unique = sorted(set(value))
        for day in unique:
            if day < 0 or day > 6:
                raise ValueError("repeat_weekdays must be in range 0..6")
        return unique

    @field_validator("repeat_month_days", "repeat_year_days")
    @classmethod
    def validate_repeat_month_days(cls, value):
        if value is None:
            return value
        unique = sorted(set(value))
        for day in unique:
            if day < 1 or day > 31:
                raise ValueError("repeat month/day values must be in range 1..31")
        return unique

    @field_validator("tag_names")
    @classmethod
    def validate_tag_names(cls, value):
        if value is None:
            return value
        cleaned = []
        for name in value:
            if name is None:
                raise ValueError("Tag name cannot be empty")
            trimmed = name.strip()
            if not trimmed:
                raise ValueError("Tag name cannot be empty")
            if len(trimmed) > 100:
                raise ValueError("Tag name must not exceed 100 characters")
            cleaned.append(trimmed)
        return cleaned


class PublicationCreate(PublicationBase):
    """Создание публикации: все обязательные + опц. поля PublicationBase + owner."""

    status: PublicationStatus = PublicationStatus.DRAFT


class PublicationUpdate(BaseModel):
    """Частичный апдейт: все поля Optional."""

    content_type: Optional[ContentType] = None
    text_content: Optional[str] = None
    formatted_content: Optional[dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
    media_thumbnail_urls: Optional[List[Optional[str]]] = None
    media_file_ids: Optional[List[Optional[str]]] = None
    media_blur: Optional[List[bool]] = None
    inline_keyboard: Optional[InlineKeyboard] = None
    poll_data: Optional[PollData] = None
    pin_message: Optional[bool] = None
    disable_notification: Optional[bool] = None
    disable_web_page_preview: Optional[bool] = None
    auto_delete_hours: Optional[int] = Field(None, gt=0)
    auto_delete_delay_seconds: Optional[int] = Field(None, gt=0)
    repeat_interval: Optional[RepeatInterval] = None
    repeat_custom_days: Optional[int] = Field(None, ge=0)
    repeat_custom_hours: Optional[int] = Field(None, ge=0)
    repeat_custom_unit: Optional[RepeatCustomUnit] = None
    repeat_custom_value: Optional[int] = Field(None, ge=1)
    repeat_weekdays: Optional[List[int]] = None
    repeat_month_days: Optional[List[int]] = None
    repeat_year_month: Optional[int] = Field(None, ge=1, le=12)
    repeat_year_days: Optional[List[int]] = None
    repeat_end_time: Optional[datetime] = None
    scheduled_time: Optional[datetime] = None
    timezone: Optional[str] = None
    series_id: Optional[int] = None
    series_order: Optional[int] = None
    reply_to_post_id: Optional[int] = None
    status: Optional[PublicationStatus] = None
    is_ad: Optional[bool] = None
    ad_buyer: Optional[str] = None
    ad_amount: Optional[Decimal] = None
    ad_currency: Optional[str] = None
    ad_note: Optional[str] = None
    channel_ids: Optional[List[int]] = None
    tag_names: Optional[List[str]] = None
    tag_color: Optional[str] = None
    tag_colors: Optional[List[str]] = None

    @field_validator("tag_names")
    @classmethod
    def validate_update_tag_names(cls, value):
        if value is None:
            return value
        cleaned = []
        for name in value:
            if name is None:
                raise ValueError("Tag name cannot be empty")
            trimmed = name.strip()
            if not trimmed:
                raise ValueError("Tag name cannot be empty")
            if len(trimmed) > 100:
                raise ValueError("Tag name must not exceed 100 characters")
            cleaned.append(trimmed)
        return cleaned

    @model_validator(mode="after")
    def validate_auto_delete(self):
        if self.auto_delete_hours is not None and self.auto_delete_delay_seconds is not None:
            raise ValueError("Provide either auto_delete_hours or auto_delete_delay_seconds, not both")
        return self

    @model_validator(mode="after")
    def validate_repeat_end_time(self):
        if self.repeat_end_time and self.scheduled_time and self.repeat_end_time < self.scheduled_time:
            raise ValueError("repeat_end_time cannot be earlier than scheduled_time")
        return self

    @field_validator("repeat_weekdays")
    @classmethod
    def validate_repeat_weekdays(cls, value):
        if value is None:
            return value
        unique = sorted(set(value))
        for day in unique:
            if day < 0 or day > 6:
                raise ValueError("repeat_weekdays must be in range 0..6")
        return unique

    @field_validator("repeat_month_days", "repeat_year_days")
    @classmethod
    def validate_repeat_month_days(cls, value):
        if value is None:
            return value
        unique = sorted(set(value))
        for day in unique:
            if day < 1 or day > 31:
                raise ValueError("repeat month/day values must be in range 1..31")
        return unique


class ChannelCompact(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    members_count: Optional[int] = None
    photo_url: Optional[str] = None


class TagCompact(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: Optional[str] = None


class PublicationCompact(BaseModel):
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
    is_ad: bool = False
    ad_buyer: Optional[str] = None
    ad_amount: Optional[Decimal] = None
    ad_currency: Optional[str] = None
    ad_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    channels: List[ChannelCompact] = []
    tags: List[TagCompact] = []
    series_id: Optional[int] = None
    series_order: Optional[int] = None
    views_count: int = 0
    forwards_count: int = 0
    reactions_count: int = 0
    comments_count: int = 0
    clicks_count: int = 0


class BotMessageCompact(BaseModel):
    id: int
    name: str
    text_content: Optional[str] = None
    media_url: Optional[str] = None
    bot_username: str
    sent_at: datetime
    total_chats: int
    success_chats: int


class PublicationCompactListResponse(BaseModel):
    items: List[PublicationCompact]
    page: int
    page_size: int
    bot_messages: List[BotMessageCompact] = []


class PublicationResponse(BaseModel):
    """Публикация с id, статусами, связанными channels[]/tags[]."""

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
    is_ad: bool = False
    ad_buyer: Optional[str] = None
    ad_amount: Optional[Decimal] = None
    ad_currency: Optional[str] = None
    ad_note: Optional[str] = None
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
    published: int = 0
    scheduled: int = 0
    draft: int = 0
    bot_messages: int = 0
    ads: int = 0


class WeekBatchDay(BaseModel):
    items: List[PublicationCompact]
    has_more: bool = False
    bot_messages: List[BotMessageCompact] = []
    total: int = 0


class WeekBatchResponse(BaseModel):
    days: dict[str, WeekBatchDay]
