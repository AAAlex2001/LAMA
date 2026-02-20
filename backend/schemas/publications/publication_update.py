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


class PublicationUpdate(BaseModel):
    content_type: Optional[ContentType] = None
    text_content: Optional[str] = None
    formatted_content: Optional[dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
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
    channel_ids: Optional[List[int]] = None
    tag_names: Optional[List[str]] = None
    tag_color: Optional[str] = None
    tag_colors: Optional[List[str]] = None

    @validator("tag_names")
    def validate_update_tag_names(cls, v):
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
