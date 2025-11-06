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
    description: Optional[str] = Field(None, description="Описание бота")
    photo_url: Optional[HttpUrl] = Field(None, description="URL фото профиля бота")
    welcome_enabled: Optional[bool] = Field(
        None, description="Включить приветственного бота"
    )
    welcome_config: Optional[WelcomeConfig] = Field(
        None, description="Полная конфигурация приветственного бота"
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
    description: Optional[str] = Field(None, description="Описание бота")
    photo_url: Optional[HttpUrl] = Field(None, description="URL фото профиля бота")
    created_at: datetime
    welcome_enabled: bool = False
    auto_approve_mode: Literal["auto", "manual", "rules"] = "manual"
    description_suffix: Optional[str] = None


class InlineButton(BaseModel):
    text: str
    url: Optional[HttpUrl] = None
    callback_data: Optional[str] = None

    @model_validator(mode="after")
    def validate_mutual_exclusive(self) -> "InlineButton":
        if self.url and self.callback_data:
            raise ValueError("InlineButton: specify either url or callback_data, not both")
        if not self.url and not self.callback_data:
            raise ValueError("InlineButton: either url or callback_data is required")
        return self


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


class AutoDeleteConfig(BaseModel):
    hours: int = Field(..., description="Через сколько часов удалить сообщение")


class DMTemplate(BaseModel):
    """Шаблон личного/чат сообщения: текст, медиа, inline-кнопки, шорткоды, опросы."""

    text: Optional[str] = None
    inline_buttons: Optional[List[List[InlineButton]]] = None
    media: Optional[List[MediaItem]] = None
    media_urls: Optional[List[HttpUrl]] = Field(None, description="Список URL медиафайлов (фото, видео, документы)")
    poll: Optional[PollContent] = None
    auto_delete: Optional[AutoDeleteConfig] = None


class AllowRules(BaseModel):
    """Правила допуска: подписка на другие каналы/группы, капча."""

    require_memberships: List[str] = Field(
        default_factory=list, description="Список каналов/групп для обязательной подписки"
    )
    captcha_enabled: bool = False


class CaptchaType(str, Enum):
    SIMPLE_BUTTON = "simple_button"


class CaptchaState(BaseModel):
    """Состояние капчи для пользователя."""

    kind: CaptchaType = CaptchaType.SIMPLE_BUTTON
    challenge_sent_message_id: Optional[int] = None
    passed: bool = False


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

    url: str
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
    BUTTON_CLICK = "button_click"


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
    daily_time: Optional[time] = None
    weekly_days: Optional[List[int]] = None
    monthly_days: Optional[List[int]] = None


class SeriesStep(BaseModel):
    offset: timedelta
    message: DMTemplate
    branch_on_click_data: Optional[str] = None
    next_series_id: Optional[str] = None


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
    deliveries_ok: int = 0
    deliveries_fail: int = 0


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


class ModerationRequest(BaseModel):
    bot_id: str
    chat_id: int | str
    user_id: int
    minutes: Optional[int] = Field(None, description="Длительность (для mute/ban)")
    reason: Optional[str] = None


class ApproveDeclineRequest(BaseModel):
    bot_id: str
    chat_id: int | str
    user_id: int


class WorkingChatsRequest(BaseModel):
    bot_id: str
    chat_ids: Optional[List[int | str]] = Field(None, description="Если пусто — все чаты")


class ProfileUpdateRequest(BaseModel):
    bot_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[HttpUrl] = None


class TemplateItem(BaseModel):
    template_id: str
    message: DMTemplate


class DelayedTriggerConfig(BaseModel):
    """Конфигурация отложенного триггера."""
    trigger_type: TriggerType
    delay_minutes: Optional[int] = None
    delay_hours: Optional[int] = None
    delay_days: Optional[int] = None
    message: DMTemplate

    @model_validator(mode="after")
    def validate_delay(self) -> "DelayedTriggerConfig":
        delays = [self.delay_minutes, self.delay_hours, self.delay_days]
        if not any(d and d > 0 for d in delays):
            raise ValueError("At least one delay (minutes/hours/days) must be specified")
        return self


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
    "ModerationRequest",
    "ApproveDeclineRequest",
    "WorkingChatsRequest",
    "ProfileUpdateRequest",
    "TemplateItem",
    "DelayedTriggerConfig",
    "MessageTargetType",
    "CaptchaState",
]


