from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator, model_validator, ConfigDict
from enum import Enum


class PublicationStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHING = "publishing"
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


class RepeatInterval(str, Enum):
    """Интервал повторения публикации"""
    NEVER = "never"
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class RepeatCustomUnit(str, Enum):
    DAYS = "days"
    WEEKS = "weeks"
    MONTHS = "months"
    YEARS = "years"


class InlineButtonType(str, Enum):
    URL = "url"
    CALLBACK = "callback"
    HIDDEN_TEXT = "hidden_text"


class InlineButton(BaseModel):
    id: Optional[str] = None
    type: Optional[InlineButtonType] = None
    text: str
    url: Optional[str] = None
    callback_data: Optional[str] = None
    hidden_text: Optional[str] = None


class InlineKeyboard(BaseModel):
    buttons: List[List[InlineButton]]


class PollData(BaseModel):
    question: str
    options: List[str] = Field(..., min_length=2, max_length=12)
    is_anonymous: bool = True
    allows_multiple_answers: bool = False
    correct_option_id: Optional[int] = None
    explanation: Optional[str] = None
    is_quiz: bool = False


class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: Optional[str] = Field(None, max_length=7)


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class TagListResponse(BaseModel):
    items: List[TagResponse]
    total: int


class ChannelResponse(BaseModel):
    """Минимальная схема канала для отображения в публикациях"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int
    title: str
    username: Optional[str] = None
    is_active: bool


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
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class RescheduleRequest(BaseModel):
    scheduled_time: datetime


class PublicationBase(BaseModel):
    content_type: ContentType
    text_content: Optional[str] = None
    formatted_content: Optional[Dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
    media_thumbnail_urls: Optional[List[Optional[str]]] = Field(None, description="URLs сжатых превьюшек для UI")
    media_file_ids: Optional[List[Optional[str]]] = Field(None, description="Telegram file_ids для быстрой рассылки")
    media_blur: Optional[List[bool]] = None
    inline_keyboard: Optional[InlineKeyboard] = None
    poll_data: Optional[PollData] = None
    pin_message: bool = False
    disable_notification: bool = False
    disable_web_page_preview: bool = True
    reply_to_post_id: Optional[int] = Field(None, description="ID публикации, на которую отвечаем")
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
    repeat_interval: RepeatInterval = RepeatInterval.NEVER
    repeat_custom_days: Optional[int] = Field(
        None,
        ge=0,
        description="Custom repeat interval in days (only used when repeat_interval is custom)"
    )
    repeat_custom_hours: Optional[int] = Field(
        None,
        ge=0,
        description="Custom repeat interval in hours (only used when repeat_interval is custom)"
    )
    repeat_custom_unit: Optional[RepeatCustomUnit] = Field(
        None,
        description="Custom repeat unit (days/weeks/months/years)"
    )
    repeat_custom_value: Optional[int] = Field(
        None,
        ge=1,
        description="Custom repeat value for the selected unit"
    )
    repeat_weekdays: Optional[List[int]] = Field(
        None,
        description="Weekdays for weekly custom repeat (0=Sunday, 1=Monday, ... 6=Saturday)"
    )
    repeat_month_days: Optional[List[int]] = Field(
        None,
        description="Days of month for monthly custom repeat (1-31)"
    )
    repeat_year_month: Optional[int] = Field(
        None,
        ge=1,
        le=12,
        description="Month for yearly custom repeat (1-12)"
    )
    repeat_year_days: Optional[List[int]] = Field(
        None,
        description="Days of month for yearly custom repeat (1-31)"
    )
    repeat_end_time: Optional[datetime] = Field(
        None,
        description="Дата/время, после которого повторы прекращаются (включительно)"
    )
    scheduled_time: Optional[datetime] = None
    timezone: str = "UTC"
    series_id: Optional[int] = None
    series_order: Optional[int] = None
    ai_prompt: Optional[str] = None
    channel_ids: List[int] = Field(default_factory=list)
    tag_names: List[str] = Field(default_factory=list)
    tag_color: Optional[str] = None

    @model_validator(mode="after")
    def validate_content_payload(cls, values):
        """Гарантирует, что у публикации есть контент.

        - TEXT: требуется текст
        - TEXT_WITH_MEDIA: требуется текст или media_urls
        - IMAGE/VIDEO/AUDIO/DOCUMENT: требуется media_urls
        """
        content_type = values.content_type
        has_text = bool(values.text_content and values.text_content.strip())
        has_media = bool(values.media_urls and len(values.media_urls) > 0)

        if content_type == ContentType.TEXT and not has_text:
            raise ValueError('text_content is required for text публикации')

        if content_type == ContentType.TEXT_WITH_MEDIA and not (has_text or has_media):
            raise ValueError('Для text_with_media требуется text_content или media_urls')

        if content_type in {ContentType.IMAGE, ContentType.VIDEO, ContentType.AUDIO, ContentType.DOCUMENT} and not has_media:
            raise ValueError(f'media_urls is required for {content_type.value} публикации')

        return values

    @model_validator(mode="after")
    def validate_auto_delete(cls, values):
        hours = values.auto_delete_hours
        seconds = values.auto_delete_delay_seconds
        if hours is not None and seconds is not None:
            raise ValueError('Provide either auto_delete_hours or auto_delete_delay_seconds, not both')
        return values

    @model_validator(mode="after")
    def validate_repeat_end_time(cls, values):
        end_time = values.repeat_end_time
        scheduled_time = values.scheduled_time
        if end_time and scheduled_time and end_time < scheduled_time:
            raise ValueError('repeat_end_time cannot be earlier than scheduled_time')
        return values

    @validator('poll_data')
    def validate_poll_data(cls, v, values):
        if 'content_type' in values and values['content_type'] in [ContentType.POLL, ContentType.QUIZ]:
            if v is None:
                raise ValueError('poll_data is required for polls and quizzes')
            if values['content_type'] == ContentType.QUIZ and v.correct_option_id is None:
                raise ValueError('correct_option_id is required for quizzes')
        return v

    @validator('repeat_weekdays')
    def validate_repeat_weekdays(cls, v):
        if v is None:
            return v
        unique = sorted(set(v))
        for day in unique:
            if day < 0 or day > 6:
                raise ValueError('repeat_weekdays must be in range 0..6')
        return unique

    @validator('repeat_month_days', 'repeat_year_days')
    def validate_repeat_month_days(cls, v):
        if v is None:
            return v
        unique = sorted(set(v))
        for day in unique:
            if day < 1 or day > 31:
                raise ValueError('repeat month/day values must be in range 1..31')
        return unique


class PublicationCreate(PublicationBase):
    status: PublicationStatus = PublicationStatus.DRAFT


class PublicationUpdate(BaseModel):
    content_type: Optional[ContentType] = None
    text_content: Optional[str] = None
    formatted_content: Optional[Dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
    media_blur: Optional[List[bool]] = None
    inline_keyboard: Optional[InlineKeyboard] = None
    poll_data: Optional[PollData] = None
    pin_message: Optional[bool] = None
    disable_notification: Optional[bool] = None
    disable_web_page_preview: Optional[bool] = None
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
    repeat_interval: Optional[RepeatInterval] = None
    repeat_custom_days: Optional[int] = Field(
        None,
        ge=0,
        description="Custom repeat interval in days (only used when repeat_interval is CUSTOM)"
    )
    repeat_custom_hours: Optional[int] = Field(
        None,
        ge=0,
        description="Custom repeat interval in hours (only used when repeat_interval is CUSTOM)"
    )
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

    @model_validator(mode="after")
    def validate_auto_delete(cls, values):
        hours = values.auto_delete_hours
        seconds = values.auto_delete_delay_seconds
        if hours is not None and seconds is not None:
            raise ValueError('Provide either auto_delete_hours or auto_delete_delay_seconds, not both')
        return values

    @model_validator(mode="after")
    def validate_repeat_end_time(cls, values):
        end_time = values.repeat_end_time
        scheduled_time = values.scheduled_time
        if end_time and scheduled_time and end_time < scheduled_time:
            raise ValueError('repeat_end_time cannot be earlier than scheduled_time')
        return values

    @validator('repeat_weekdays')
    def validate_repeat_weekdays(cls, v):
        if v is None:
            return v
        unique = sorted(set(v))
        for day in unique:
            if day < 0 or day > 6:
                raise ValueError('repeat_weekdays must be in range 0..6')
        return unique

    @validator('repeat_month_days', 'repeat_year_days')
    def validate_repeat_month_days(cls, v):
        if v is None:
            return v
        unique = sorted(set(v))
        for day in unique:
            if day < 1 or day > 31:
                raise ValueError('repeat month/day values must be in range 1..31')
        return unique


class PublicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_type: ContentType
    status: PublicationStatus
    text_content: Optional[str] = None
    formatted_content: Optional[Dict[str, Any]] = None
    media_urls: Optional[List[str]] = None
    media_thumbnail_urls: Optional[List[Optional[str]]] = None
    media_file_ids: Optional[List[Optional[str]]] = None
    media_blur: Optional[List[bool]] = None
    inline_keyboard: Optional[Dict[str, Any]] = None
    poll_data: Optional[Dict[str, Any]] = None
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
    channels: List[ChannelResponse] = []
    tags: List[TagResponse] = []
    series: Optional[PublicationSeriesResponse] = None


class PublicationListResponse(BaseModel):
    items: List[PublicationResponse]
    page: int
    page_size: int


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


class AIEditTextRequest(BaseModel):
    text: str = Field(..., min_length=0, max_length=20000)
    instruction: str = Field(..., min_length=1, max_length=500)


class AIEditTextResponse(BaseModel):
    result: str


class EditPublishedRequest(BaseModel):
    """Параметры изменения уже опубликованного сообщения в Telegram."""

    text_content: Optional[str] = Field(None, min_length=1)
    media_urls: Optional[List[str]] = Field(
        default=None, description="Новые ссылки на медиа-файлы (для типов IMAGE/VIDEO/AUDIO/DOCUMENT и text_with_media с одним медиа)"
    )
    inline_keyboard: Optional[InlineKeyboard] = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    publication_id: int
    status: str
    message: str
    error_details: Optional[Dict[str, Any]]
    created_at: datetime


class TelegramMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    publication_id: int
    channel_id: int
    telegram_message_id: int
    published_at: datetime


class ChannelPublishResult(BaseModel):
    """Результат публикации в один канал"""
    channel: str
    success: bool
    error: Optional[str] = None
    message_ids: Optional[List[int]] = None
    replied_to: Optional[int] = None
    telegram_messages_data: Optional[List[Dict[str, Any]]] = None
    sent_messages: Optional[Any] = None
    channel_obj: Optional[Any] = None
    notification_error: Optional[str] = None
    
    class Config:
        arbitrary_types_allowed = True


class PublishResult(BaseModel):
    """Результат публикации в несколько каналов"""
    success: bool
    results: List[ChannelPublishResult]
    success_count: int
    total_count: int
    publication_id: Optional[int] = None
    error: Optional[str] = None


class EditMessageResult(BaseModel):
    """Результат редактирования сообщения"""
    success: bool
    results: List[ChannelPublishResult]
    success_count: int
    total_count: int
    error: Optional[str] = None


class DeleteMessageResult(BaseModel):
    """Результат удаления сообщения"""
    success: bool
    results: List[ChannelPublishResult]
    success_count: int
    total_count: int
    error: Optional[str] = None


class TextTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    formatted_content: Dict[str, Any]


class TextTemplateCreate(TextTemplateBase):
    pass


class TextTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    formatted_content: Optional[Dict[str, Any]] = None


class TextTemplateResponse(TextTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    created_at: datetime


class TextTemplateListResponse(BaseModel):
    items: List[TextTemplateResponse]
    total: int
