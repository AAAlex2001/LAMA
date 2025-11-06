from __future__ import annotations
from typing import List, Optional, Literal, Union
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl, constr
from uuid import UUID

# --- Inline keyboard ---

class InlineButton(BaseModel):
    text: constr(min_length=1, max_length=64)
    url: Optional[HttpUrl] = None
    callback_data: Optional[constr(max_length=64)] = None  # поддержка callback-кнопок
    switch_inline_query: Optional[str] = None


class InlineKeyboard(BaseModel):
    rows: List[List[InlineButton]] = Field(default_factory=list)


# --- Content parts ---

class TextContent(BaseModel):
    kind: Literal["text"] = "text"
    text: str
    disable_web_preview: bool = False


class MediaContent(BaseModel):
    kind: Literal["image", "video", "audio", "document"]  # одно из
    file_id: Optional[str] = None      # если уже загружено в TG
    url: Optional[HttpUrl] = None      # либо URL
    caption: Optional[str] = None
    has_spoiler: bool = False          # блюр, снимается нажатием
    duration: Optional[int] = None     # для аудио/видео
    width: Optional[int] = None        # для видео/фото
    height: Optional[int] = None


class LinkContent(BaseModel):
    kind: Literal["link"] = "link"
    url: HttpUrl
    title: Optional[str] = None
    caption: Optional[str] = None


class PollContent(BaseModel):
    kind: Literal["poll"] = "poll"
    question: str
    options: List[constr(min_length=1, max_length=100)]
    is_anonymous: bool = True
    allows_multiple_answers: bool = False
    is_quiz: bool = False
    correct_option_id: Optional[int] = None
    explanation: Optional[str] = None


class EmojiStyle(BaseModel):
    kind: Literal["style"] = "style"
    emojis: List[str] = Field(default_factory=list)  # для украшений
    header: Optional[str] = None
    footer: Optional[str] = None


ContentPart = Union[TextContent, MediaContent, LinkContent, PollContent, EmojiStyle]


# --- Core schemas ---

class PublicationBase(BaseModel):
    title: str = ""
    content: List[ContentPart] = Field(default_factory=list)
    parse_mode: Literal["HTML", "MarkdownV2"] = "HTML"
    auto_pin: bool = False
    auto_delete_hours: Optional[int] = Field(default=None, ge=1)
    preview_only: bool = False
    tz: str = "Europe/Riga"
    buttons: Optional[InlineKeyboard] = None
    tags: List[str] = Field(default_factory=list)


class PublicationCreate(PublicationBase):
    target_channel_ids: List[UUID] = Field(default_factory=list)
    scheduled_at: Optional[datetime] = None
    series_id: Optional[UUID] = None
    series_dates: Optional[List[datetime]] = None  # для «сериала публикаций»


class PublicationUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[List[ContentPart]] = None
    parse_mode: Optional[Literal["HTML", "MarkdownV2"]] = None
    auto_pin: Optional[bool] = None
    auto_delete_hours: Optional[int] = Field(default=None, ge=1)
    preview_only: Optional[bool] = None
    tz: Optional[str] = None
    buttons: Optional[InlineKeyboard] = None
    tags: Optional[List[str]] = None
    scheduled_at: Optional[datetime] = None
    target_channel_ids: Optional[List[UUID]] = None


class PublicationRead(PublicationBase):
    id: UUID
    status: str
    scheduled_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    series_id: Optional[UUID] = None


class ChannelCreate(BaseModel):
    tg_chat_id: int
    title: str
    timezone: str = "Europe/Riga"
    is_active: bool = True


class ChannelRead(BaseModel):
    id: UUID
    tg_chat_id: int
    title: str
    timezone: str
    is_active: bool


class EditRequest(BaseModel):
    channel_id: UUID
    message_index: int = 0  # если публикация отдала несколько сообщений
    new_text: Optional[str] = None
    new_caption: Optional[str] = None
    parse_mode: Optional[Literal["HTML", "MarkdownV2"]] = None


# --- Calendar ---

class CalendarEvent(BaseModel):
    id: UUID
    title: str
    start: datetime
    end: Optional[datetime] = None
    status: str
    channel_ids: List[UUID] = Field(default_factory=list)
