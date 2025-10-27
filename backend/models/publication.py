"""
Модели данных для модуля "Публикации".
Поддержка всех типов контента, отложенной публикации, черновиков, календаря.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ContentType(str, Enum):
    """Типы контента публикации."""
    TEXT = "text"
    TEXT_WITH_MEDIA = "text_with_media"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    LINK = "link"
    POLL = "poll"
    QUIZ = "quiz"


class PublicationStatus(str, Enum):
    """Статусы публикации."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"
    DELETED = "deleted"


class MediaContent(BaseModel):
    """Медиа контент с блюром."""
    url: str = Field(..., description="URL медиафайла")
    blur: bool = Field(default=False, description="Блюр, отменяется по нажатию")
    caption: Optional[str] = Field(None, description="Подпись к медиа")


class InlineButton(BaseModel):
    """Встроенная кнопка."""
    text: str = Field(..., description="Текст кнопки")
    url: Optional[str] = Field(None, description="URL для кнопки")
    callback_data: Optional[str] = Field(None, description="Callback data")


class PollOption(BaseModel):
    """Вариант ответа в опросе."""
    text: str = Field(..., description="Текст варианта")


class PollContent(BaseModel):
    """Опрос или викторина."""
    question: str = Field(..., description="Вопрос")
    options: List[PollOption] = Field(..., description="Варианты ответов")
    is_quiz: bool = Field(default=False, description="Викторина (с правильным ответом)")
    correct_option_id: Optional[int] = Field(None, description="ID правильного ответа для викторины")
    is_anonymous: bool = Field(default=True, description="Анонимный опрос")
    allows_multiple_answers: bool = Field(default=False, description="Множественный выбор")


class AutoDeleteConfig(BaseModel):
    """Конфигурация автоудаления."""
    enabled: bool = Field(default=False, description="Включено автоудаление")
    hours: int = Field(..., description="Часов до удаления (1, 24, 36, 48, 60, 72)")


class PublicationCreate(BaseModel):
    """Создание новой публикации."""
    content_type: ContentType = Field(..., description="Тип контента")
    text: Optional[str] = Field(None, description="Текстовое содержимое")
    media: Optional[List[MediaContent]] = Field(None, description="Медиа файлы")
    poll: Optional[PollContent] = Field(None, description="Опрос или викторина")
    inline_buttons: Optional[List[List[InlineButton]]] = Field(None, description="Inline keyboard (ряды кнопок)")
    link: Optional[str] = Field(None, description="Ссылка")
    
    channel_ids: List[str] = Field(..., description="ID каналов для публикации")
    tags: Optional[List[str]] = Field(default_factory=list, description="Теги для поиска")
    
    is_draft: bool = Field(default=False, description="Сохранить как черновик")
    scheduled_at: Optional[datetime] = Field(None, description="Дата/время отложенной публикации")
    timezone: str = Field(default="UTC", description="Часовой пояс")
    
    auto_pin: bool = Field(default=False, description="Автозакрепление")
    auto_delete: Optional[AutoDeleteConfig] = Field(None, description="Автоудаление")
    
    series_id: Optional[str] = Field(None, description="ID сериала публикаций")


class PublicationUpdate(BaseModel):
    """Обновление существующей публикации."""
    text: Optional[str] = None
    media: Optional[List[MediaContent]] = None
    poll: Optional[PollContent] = None
    inline_buttons: Optional[List[List[InlineButton]]] = None
    link: Optional[str] = None
    
    channel_ids: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    
    scheduled_at: Optional[datetime] = None
    timezone: Optional[str] = None
    
    auto_pin: Optional[bool] = None
    auto_delete: Optional[AutoDeleteConfig] = None


class PublicationResponse(BaseModel):
    """Ответ с данными публикации."""
    id: str = Field(..., description="ID публикации")
    content_type: ContentType
    text: Optional[str] = None
    media: Optional[List[MediaContent]] = None
    poll: Optional[PollContent] = None
    inline_buttons: Optional[List[List[InlineButton]]] = None
    link: Optional[str] = None
    
    channel_ids: List[str]
    tags: List[str]
    
    status: PublicationStatus
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    timezone: str
    
    auto_pin: bool
    auto_delete: Optional[AutoDeleteConfig] = None
    
    series_id: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime


class PublicationPreview(BaseModel):
    """Предпросмотр публикации."""
    text: Optional[str] = None
    media: Optional[List[MediaContent]] = None
    poll: Optional[PollContent] = None
    inline_buttons: Optional[List[List[InlineButton]]] = None
    formatted_html: str = Field(..., description="Отформатированный HTML для предпросмотра")


class CalendarEvent(BaseModel):
    """События в календаре публикаций."""
    date: str = Field(..., description="Дата в формате YYYY-MM-DD")
    publications: List[PublicationResponse]


class PublicationNotificationCreate(BaseModel):
    """Создание уведомления о публикации."""
    publication_id: str = Field(..., description="ID публикации")
    status: str = Field(..., description="success или error")
    message: str = Field(..., description="Текст уведомления")
    channel_id: Optional[str] = Field(None, description="ID канала")
    error_details: Optional[str] = Field(None, description="Детали ошибки")


class PublicationNotification(BaseModel):
    """Уведомление о публикации."""
    publication_id: str
    status: str = Field(..., description="success или error")
    message: str
    channel_id: Optional[str] = None
    error_details: Optional[str] = None


class RescheduleRequest(BaseModel):
    """Запрос на перенос публикации."""
    scheduled_at: datetime = Field(..., description="Новая дата/время в ISO8601 с таймзоной")
    timezone: str = Field(default="UTC", description="Часовой пояс")


class AITextRequest(BaseModel):
    """Запрос на генерацию/редактирование текста через AI."""
    action: str = Field(..., description="generate или edit")
    prompt: Optional[str] = Field(None, description="Промпт для генерации")
    text: Optional[str] = Field(None, description="Текст для редактирования")
    instruction: Optional[str] = Field(None, description="Инструкция для редактирования")


class AITextResponse(BaseModel):
    """Ответ от AI текстового редактора."""
    text: str = Field(..., description="Сгенерированный/отредактированный текст")


class SeriesCreate(BaseModel):
    """Создание сериала публикаций."""
    name: str = Field(..., description="Название сериала")
    publications: List[PublicationCreate] = Field(..., description="Список публикаций с разными датами")


class SeriesResponse(BaseModel):
    """Ответ с данными сериала."""
    id: str
    name: str
    publications: List[PublicationResponse]
    created_at: datetime


__all__ = [
    "ContentType",
    "PublicationStatus",
    "MediaContent",
    "InlineButton",
    "PollOption",
    "PollContent",
    "AutoDeleteConfig",
    "PublicationCreate",
    "PublicationUpdate",
    "PublicationResponse",
    "PublicationPreview",
    "CalendarEvent",
    "PublicationNotification",
    "PublicationNotificationCreate",
    "RescheduleRequest",
    "AITextRequest",
    "AITextResponse",
    "SeriesCreate",
    "SeriesResponse",
]

