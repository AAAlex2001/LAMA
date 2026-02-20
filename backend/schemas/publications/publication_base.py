from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, Field, validator, model_validator

from backend.schemas.publications.enums import (
    ContentType,
    PublicationStatus,
    RepeatInterval,
    RepeatCustomUnit,
)
from backend.schemas.publications.common import InlineKeyboard, PollData


class PublicationBase(BaseModel):
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
    channel_ids: List[int] = Field(default_factory=list)
    tag_names: List[str] = Field(default_factory=list)
    tag_color: Optional[str] = None
    tag_colors: Optional[List[str]] = None

    @model_validator(mode="after")
    def validate_content_payload(cls, values):
        ct = values.content_type
        has_text = bool(values.text_content and values.text_content.strip())
        has_media = bool(values.media_urls and len(values.media_urls) > 0)

        if ct == ContentType.TEXT and not has_text:
            raise ValueError("text_content is required for text publications")
        if ct == ContentType.TEXT_WITH_MEDIA and not (has_text or has_media):
            raise ValueError("text_content or media_urls required for text_with_media")
        media_types = {ContentType.IMAGE, ContentType.VIDEO, ContentType.AUDIO, ContentType.DOCUMENT}
        if ct in media_types and not has_media:
            raise ValueError(f"media_urls is required for {ct.value} publications")
        return values

    @model_validator(mode="after")
    def validate_auto_delete(cls, values):
        if values.auto_delete_hours is not None and values.auto_delete_delay_seconds is not None:
            raise ValueError("Provide either auto_delete_hours or auto_delete_delay_seconds, not both")
        return values

    @model_validator(mode="after")
    def validate_repeat_end_time(cls, values):
        if values.repeat_end_time and values.scheduled_time and values.repeat_end_time < values.scheduled_time:
            raise ValueError("repeat_end_time cannot be earlier than scheduled_time")
        return values

    @validator("poll_data")
    def validate_poll_data(cls, v, values):
        if "content_type" in values and values["content_type"] in [ContentType.POLL, ContentType.QUIZ]:
            if v is None:
                raise ValueError("poll_data is required for polls and quizzes")
            if values["content_type"] == ContentType.QUIZ and v.correct_option_id is None:
                raise ValueError("correct_option_id is required for quizzes")
        return v

    @validator("repeat_weekdays")
    def validate_repeat_weekdays(cls, v):
        if v is None:
            return v
        unique = sorted(set(v))
        for day in unique:
            if day < 0 or day > 6:
                raise ValueError("repeat_weekdays must be in range 0..6")
        return unique

    @validator("repeat_month_days", "repeat_year_days")
    def validate_repeat_month_days(cls, v):
        if v is None:
            return v
        unique = sorted(set(v))
        for day in unique:
            if day < 1 or day > 31:
                raise ValueError("repeat month/day values must be in range 1..31")
        return unique

    @validator("tag_names")
    def validate_tag_names(cls, v):
        if v is None:
            return v
        cleaned = []
        for name in v:
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
    status: PublicationStatus = PublicationStatus.DRAFT
