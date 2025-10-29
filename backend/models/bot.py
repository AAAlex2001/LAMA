"""
Модели данных для модуля "Боты".
CRUD ботов по токену, настройки приветственного бота, сообщения и правила допуска.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, HttpUrl, model_validator
from typing import Optional, List, Dict, Literal
from datetime import datetime, time, timedelta
from enum import Enum


class BotCreate(BaseModel):
    """Создание нового бота по токену Telegram."""

    token: str = Field(..., min_length=10, description="Токен Telegram Bot API")
    name: Optional[str] = Field(None, description="Человеко-читаемое имя бота")


class BotUpdate(BaseModel):
    """Обновление параметров бота."""

    name: Optional[str] = Field(None, description="Имя бота")
    welcome_enabled: Optional[bool] = Field(
        None, description="Включить приветственного бота"
    )
    auto_approve_mode: Optional[Literal["auto", "manual", "rules"]] = None
    description_suffix: Optional[str] = Field(
        None,
        description=(
            "Статический текст, который должен быть в описании бота. "
            "Например: 'Создано при помощи сервиса @LamaPlanner'"
        ),
    )


class BotResponse(BaseModel):
    """Информация о боте."""

    id: str = Field(..., description="Внутренний ID бота")
    username: str = Field(..., description="@username бота")
    name: Optional[str] = Field(None, description="Имя бота")
    created_at: datetime
    welcome_enabled: bool = False
    auto_approve_mode: Literal["auto", "manual", "rules"] = "manual"
    description_suffix: Optional[str] = None


class Shortcode(str):
    """Шорткод, поддерживает значения {username}, {firstname}, {date} и т.п."""


class InlineButton(BaseModel):
    text: str
    url: Optional[HttpUrl] = None
    callback_data: Optional[str] = None

    @model_validator(mode="after")
    def _validate_mutual_exclusive(self) -> "InlineButton":
        if self.url and self.callback_data:
            raise ValueError("InlineButton: specify either url or callback_data, not both")
        if not self.url and not self.callback_data:
            # допустим текстовую кнопку без действия? Нет — потребуем одно
            raise ValueError("InlineButton: either url or callback_data is required")
        return self


class DMTemplate(BaseModel):
    """Шаблон личного сообщения: текст, медиа, inline-кнопки, шорткоды."""

    text: Optional[str] = None
    inline_buttons: Optional[List[List[InlineButton]]] = None
    media_urls: Optional[List[HttpUrl]] = None  # legacy


class MediaType(str, Enum):
    PHOTO = "photo"
    VIDEO = "video"
    DOCUMENT = "document"


class MediaItem(BaseModel):
    type: MediaType
    url: HttpUrl
    caption: Optional[str] = None


class PollContent(BaseModel):
    question: str
    options: List[str]
    is_anonymous: bool = True
    quiz: bool = False
    correct_option_id: Optional[int] = None


class DMTemplate(BaseModel):
    text: Optional[str] = None
    inline_buttons: Optional[List[List[InlineButton]]] = None
    media: Optional[List[MediaItem]] = None
    poll: Optional[PollContent] = None


class AllowRules(BaseModel):
    """Правила допуска: подписка на другие каналы/группы, капча."""

    require_memberships: List[str] = Field(
        default_factory=list, description="Список каналов/групп для обязательной подписки"
    )
    captcha_enabled: bool = False


class WelcomeConfig(BaseModel):
    """Конфигурация приветственного бота."""

    enabled: bool = False
    greet_message: DMTemplate = Field(default_factory=DMTemplate)
    rules_message: Optional[DMTemplate] = None
    allow_rules: AllowRules = Field(default_factory=AllowRules)
    mode: Literal["auto", "manual", "rules"] = "manual"


class SendDMRequest(BaseModel):
    """Отправка DM от имени бота."""

    bot_id: str
    user_id: int
    message: DMTemplate


class SetWebhookRequest(BaseModel):
    """Настройка вебхука Telegram для бота (bot_id в пути)."""

    url: HttpUrl
    secret_token: Optional[str] = None


class MessageTargetType(str, Enum):
    USER = "user"
    CHAT = "chat"
    CHANNEL = "channel"


class SendMessageRequest(BaseModel):
    """Отправка сообщения в чат/канал/пользователю."""

    bot_id: str
    target_type: MessageTargetType = MessageTargetType.USER
    target_id: int | str
    message: DMTemplate


class TriggerType(str, Enum):
    JOIN_REQUEST_CREATED = "join_request_created"
    JOIN_REQUEST_APPROVED = "join_request_approved"
    JOIN_REQUEST_DECLINED = "join_request_declined"
    MEMBER_JOINED = "member_joined"
    MEMBER_LEFT = "member_left"
    CAPTCHA_PASSED = "captcha_passed"
    CAPTCHA_FAILED = "captcha_failed"
    USER_MESSAGE = "user_message"
    USER_COMMAND = "user_command"


class ScheduleType(str, Enum):
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    WEEKDAYS = "weekdays"
    POINTS = "points"
    SERIES = "series"


class TimePoint(BaseModel):
    at: time


class ScheduleConfig(BaseModel):
    type: ScheduleType
    run_at: Optional[datetime] = None
    until: Optional[datetime] = None
    repeat_count: Optional[int] = None
    points: Optional[List[TimePoint]] = None
    timezone: str = Field(default="UTC", description="IANA timezone, e.g. Europe/Moscow")
    # Расширение для daily/weekly/monthly/weekdays
    daily_time: Optional[time] = None
    weekly_days: Optional[List[int]] = None  # 0=Mon ... 6=Sun
    monthly_days: Optional[List[int]] = None  # 1..31


class SeriesStep(BaseModel):
    offset: timedelta
    message: DMTemplate


class SeriesCreate(BaseModel):
    bot_id: str
    steps: List[SeriesStep]


class AudienceFilter(BaseModel):
    applicants: Optional[Literal["all", "approved", "declined", "no_response"]] = None
    membership_required: Optional[List[str]] = None
    has_captcha: Optional[bool] = None
    recent_days: Optional[int] = None
    exclude_received_series_id: Optional[str] = None


class ScheduleMessageRequest(BaseModel):
    bot_id: str
    target_type: MessageTargetType
    target_ids: List[int | str]
    message: DMTemplate
    schedule: ScheduleConfig
    audience: Optional[AudienceFilter] = None


class StatsResponse(BaseModel):
    bot_id: str
    clicks_by_callback: Dict[str, int] = Field(default_factory=dict)
    total_users: int = 0
    blocked_users: int = 0


class PreviewRequest(BaseModel):
    bot_id: str
    message: DMTemplate
    user_id: Optional[int] = None
    timezone: str = Field(default="UTC")


class PreviewResponse(BaseModel):
    rendered_text: str


class CommandItem(BaseModel):
    command: str = Field(..., description="Команда в личке, например /help")
    response: DMTemplate


class CommandsResponse(BaseModel):
    bot_id: str
    commands: Dict[str, DMTemplate] = Field(default_factory=dict)


__all__ = [
    "BotCreate",
    "BotUpdate",
    "BotResponse",
    "DMTemplate",
    "InlineButton",
    "AllowRules",
    "WelcomeConfig",
    "SendDMRequest",
    "SetWebhookRequest",
    "SendMessageRequest",
    "TriggerType",
    "ScheduleType",
    "ScheduleConfig",
    "ScheduleMessageRequest",
    "SeriesCreate",
    "AudienceFilter",
    "StatsResponse",
    "CommandItem",
    "CommandsResponse",
]


