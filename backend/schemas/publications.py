from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator, model_validator
from enum import Enum


class PublicationStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    PARTIAL_SUCCESS = "partial_success"
    FAILED = "failed"
    DELETED = "deleted"


class ContentType(str, Enum):
    TEXT = "text"
    TEXT_WITH_MEDIA = "text_with_media"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    LINK = "link"
    POLL = "poll"
    QUIZ = "quiz"


class InlineButton(BaseModel):
    text: str
    url: Optional[str] = None
    callback_data: Optional[str] = None


class InlineKeyboard(BaseModel):
    buttons: List[List[InlineButton]]


class PollData(BaseModel):
    question: str
    options: List[str] = Field(..., min_length=2, max_length=10)
    is_anonymous: bool = True
    allows_multiple_answers: bool = False
    correct_option_id: Optional[int] = None
    explanation: Optional[str] = None
    is_quiz: bool = False


class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChannelResponse(BaseModel):
    """Минимальная схема канала для отображения в публикациях"""
    id: int
    telegram_id: int
    title: str
    username: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class PublicationSeriesBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    reply_to_previous: bool = Field(default=True, description="Отвечать на предыдущие посты в серии")


class PublicationSeriesCreate(PublicationSeriesBase):
    pass


class PublicationSeriesUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    reply_to_previous: Optional[bool] = None


class PublicationSeriesResponse(PublicationSeriesBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RescheduleRequest(BaseModel):
    scheduled_time: datetime


class PublicationBase(BaseModel):
    content_type: ContentType
    text_content: Optional[str] = None
    formatted_content: Optional[Dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
    media_blur: bool = False
    inline_keyboard: Optional[InlineKeyboard] = None
    poll_data: Optional[PollData] = None
    pin_message: bool = False
    auto_delete_hours: Optional[int] = Field(
        None,
        gt=0,
        description="Delay in hours after publication before auto-deletion (legacy field)"
    )
    auto_delete_delay_seconds: Optional[int] = Field(
        None,
        gt=0,
        description="Delay in seconds after publication before auto-deletion kicks in"
    )
    scheduled_time: Optional[datetime] = None
    timezone: str = "UTC"
    series_id: Optional[int] = None
    series_order: Optional[int] = None
    ai_prompt: Optional[str] = None
    channel_ids: List[int] = Field(default_factory=list)
    tag_names: List[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_auto_delete(cls, values):
        hours = values.auto_delete_hours
        seconds = values.auto_delete_delay_seconds
        if hours is not None and seconds is not None:
            raise ValueError('Provide either auto_delete_hours or auto_delete_delay_seconds, not both')
        return values

    @validator('poll_data')
    def validate_poll_data(cls, v, values):
        if 'content_type' in values and values['content_type'] in [ContentType.POLL, ContentType.QUIZ]:
            if v is None:
                raise ValueError('poll_data is required for polls and quizzes')
            if values['content_type'] == ContentType.QUIZ and v.correct_option_id is None:
                raise ValueError('correct_option_id is required for quizzes')
        return v


class PublicationCreate(PublicationBase):
    status: PublicationStatus = PublicationStatus.DRAFT


class PublicationUpdate(BaseModel):
    content_type: Optional[ContentType] = None
    text_content: Optional[str] = None
    formatted_content: Optional[Dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
    media_blur: Optional[bool] = None
    inline_keyboard: Optional[InlineKeyboard] = None
    poll_data: Optional[PollData] = None
    pin_message: Optional[bool] = None
    auto_delete_hours: Optional[int] = Field(
        None,
        gt=0,
        description="Delay in hours after publication before auto-deletion (legacy field)"
    )
    auto_delete_delay_seconds: Optional[int] = Field(
        None,
        gt=0,
        description="Delay in seconds after publication before auto-deletion kicks in"
    )
    scheduled_time: Optional[datetime] = None
    timezone: Optional[str] = None
    series_id: Optional[int] = None
    series_order: Optional[int] = None
    status: Optional[PublicationStatus] = None
    channel_ids: Optional[List[int]] = None
    tag_names: Optional[List[str]] = None

    @model_validator(mode="after")
    def validate_auto_delete(cls, values):
        hours = values.auto_delete_hours
        seconds = values.auto_delete_delay_seconds
        if hours is not None and seconds is not None:
            raise ValueError('Provide either auto_delete_hours or auto_delete_delay_seconds, not both')
        return values


class PublicationResponse(BaseModel):
    id: int
    content_type: ContentType
    status: PublicationStatus
    text_content: Optional[str] = None
    formatted_content: Optional[Dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
    media_blur: bool = False
    inline_keyboard: Optional[Dict[str, Any]] = None
    poll_data: Optional[Dict[str, Any]] = None
    pin_message: bool = False
    auto_delete_hours: Optional[int] = None
    auto_delete_delay_seconds: Optional[int] = None
    scheduled_time: Optional[datetime] = None
    timezone: str = "UTC"
    series_id: Optional[int] = None
    series_order: Optional[int] = None
    ai_generated: bool
    ai_prompt: Optional[str] = None
    published_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    channels: List[ChannelResponse] = []
    tags: List[TagResponse] = []
    series: Optional[PublicationSeriesResponse] = None

    class Config:
        from_attributes = True


class PublicationListResponse(BaseModel):
    items: List[PublicationResponse]
    total: int
    page: int
    page_size: int
    pages: int


class PublicationPreview(BaseModel):
    text: str
    media_preview: Optional[List[str]] = None
    keyboard_preview: Optional[str] = None
    poll_preview: Optional[str] = None


class CalendarEntry(BaseModel):
    date: str
    publications: List[PublicationResponse]


class AIGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=1000)
    content_type: ContentType = ContentType.TEXT
    tone: Optional[str] = "neutral"
    max_length: Optional[int] = Field(500, ge=50, le=4000)


class AIEditRequest(BaseModel):
    publication_id: int
    instruction: str = Field(..., min_length=10, max_length=500)


class EditPublishedRequest(BaseModel):
    """Параметры изменения уже опубликованного сообщения в Telegram."""

    text_content: Optional[str] = Field(None, min_length=1)
    media_urls: Optional[List[str]] = Field(
        default=None, description="Новые ссылки на медиа-файлы (для типов IMAGE/VIDEO/AUDIO/DOCUMENT и text_with_media с одним медиа)"
    )
    inline_keyboard: Optional[InlineKeyboard] = None


class NotificationResponse(BaseModel):
    id: int
    publication_id: int
    status: str
    message: str
    error_details: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class TelegramMessageResponse(BaseModel):
    id: int
    publication_id: int
    channel_id: int
    telegram_message_id: int
    published_at: datetime

    class Config:
        from_attributes = True

