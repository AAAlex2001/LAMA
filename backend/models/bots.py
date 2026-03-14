"""
Модели для работы с ботами
"""
from datetime import datetime, timezone
from sqlalchemy import Integer, BigInteger, String, Boolean, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum, UniqueConstraint, Index
from sqlalchemy.orm import relationship, Mapped, mapped_column
import enum
from typing import Optional

from backend.models.base import Base


class BotStatus(str, enum.Enum):
    """Статус бота"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ERROR = "ERROR"


class TriggerType(str, enum.Enum):
    """Тип триггера (события)"""
    JOIN_REQUEST_CREATED = "JOIN_REQUEST_CREATED"  # Заявка на вступление создана
    JOIN_REQUEST_APPROVED = "JOIN_REQUEST_APPROVED"  # Заявка одобрена
    JOIN_REQUEST_REJECTED = "JOIN_REQUEST_REJECTED"  # Заявка отклонена
    MEMBER_JOINED = "MEMBER_JOINED"  # Участник вступил
    MEMBER_LEFT = "MEMBER_LEFT"  # Участник покинул
    CAPTCHA_PASSED = "CAPTCHA_PASSED"  # Капча пройдена
    CAPTCHA_FAILED = "CAPTCHA_FAILED"  # Капча не пройдена
    USER_MESSAGE = "USER_MESSAGE"  # Пользователь написал боту
    COMMAND_CALLED = "COMMAND_CALLED"  # Вызвана команда


class TriggerActionType(str, enum.Enum):
    """Тип действия триггера"""
    SEND_MESSAGE = "SEND_MESSAGE"  # Отправить сообщение
    SEND_MEDIA = "SEND_MEDIA"  # Отправить медиа
    ADD_TO_GROUP = "ADD_TO_GROUP"  # Добавить в группу
    REMOVE_FROM_GROUP = "REMOVE_FROM_GROUP"  # Удалить из группы
    MUTE_USER = "MUTE_USER"  # Заглушить пользователя
    BAN_USER = "BAN_USER"  # Забанить пользователя


class ApprovalMode(str, enum.Enum):
    """Режим одобрения заявок"""
    AUTO = "AUTO"  # Автоматическое одобрение всех
    MANUAL = "MANUAL"  # Ручное одобрение
    CRITERIA = "CRITERIA"  # По критериям (подписка на другие каналы и т.д.)


class CaptchaMode(str, enum.Enum):
    """Режим капчи"""
    DISABLED = "DISABLED"  # Капча отключена
    JOIN_REQUEST = "JOIN_REQUEST"  # Капча при заявке на вступление (в ЛС)
    AFTER_JOIN = "AFTER_JOIN"  # Капча после вступления (в группе)
    BOTH = "BOTH"  # Оба режима


class MessageType(str, enum.Enum):
    """Тип сообщения"""
    TEXT = "TEXT"
    PHOTO = "PHOTO"
    VIDEO = "VIDEO"
    DOCUMENT = "DOCUMENT"
    AUDIO = "AUDIO"
    VOICE = "VOICE"
    STICKER = "STICKER"
    ANIMATION = "ANIMATION"


class TriggerChatType(str, enum.Enum):
    """Тип чата для срабатывания триггера"""
    PRIVATE = "PRIVATE"  # Только в ЛС с ботом
    GROUP = "GROUP"  # Только в группах/супергруппах
    BOTH = "BOTH"  # И в ЛС, и в группах


class Bot(Base):
    """Модель бота"""
    __tablename__ = "bots"
    __table_args__ = (
        UniqueConstraint('owner_id', 'telegram_id', name='bots_owner_telegram_unique'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Telegram данные
    telegram_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    token: Mapped[str] = mapped_column(String(255), nullable=False)  # Храним токен для работы
    
    # Информация о боте
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    short_description: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    # Статус
    status: Mapped[BotStatus] = mapped_column(SQLEnum(BotStatus), default=BotStatus.ACTIVE, nullable=False)
    is_webhook_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    webhook_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    # Настройки приветствия
    welcome_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    welcome_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    welcome_media_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    welcome_media_type: Mapped[Optional[MessageType]] = mapped_column(SQLEnum(MessageType), nullable=True)
    welcome_buttons: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Inline keyboard
    welcome_message_thread_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)  # ID топика для групповых приветствий
    
    # Капча (два режима)
    join_captcha_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # Старое поле для обратной совместимости
    captcha_mode: Mapped[CaptchaMode] = mapped_column(SQLEnum(CaptchaMode), default=CaptchaMode.DISABLED, nullable=False)  # Новое поле
    captcha_timeout_seconds: Mapped[int] = mapped_column(Integer, default=10, nullable=False)  # Таймаут для капчи в группе
    
    # Настройки автоодобрения
    auto_approval_mode: Mapped[ApprovalMode] = mapped_column(SQLEnum(ApprovalMode), default=ApprovalMode.MANUAL, nullable=False)
    approval_criteria: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Критерии для одобрения
    
    # Метаданные
    last_update_id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Для long polling (bot updates)
    last_channel_update_id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Для long polling (channel posts)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="bots")
    messages = relationship("BotMessage", back_populates="bot", cascade="all, delete-orphan")
    commands = relationship("BotCommand", back_populates="bot", cascade="all, delete-orphan")


class BotMessage(Base):
    """Модель сообщения бота"""
    __tablename__ = "bot_messages"
    __table_args__ = (
        Index("ix_bot_messages_bot_chat_created", "bot_id", "chat_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    
    # Telegram данные
    telegram_message_id: Mapped[int] = mapped_column(Integer, nullable=False)
    chat_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)  # ID пользователя, если есть
    
    # Содержимое
    message_type: Mapped[MessageType] = mapped_column(SQLEnum(MessageType), default=MessageType.TEXT, nullable=False)
    text_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    media_file_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    media_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    reply_to_message_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Направление
    is_incoming: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # True = от пользователя, False = от бота
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)   # True = системное (триггер/команда/авто-ответ)
    
    # Метаданные
    raw_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Полные данные сообщения
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    bot = relationship("Bot", back_populates="messages")

    @property
    def media_group_id(self) -> Optional[str]:
        if not self.raw_data:
            return None

        media_group_id = self.raw_data.get("media_group_id")
        if media_group_id is None:
            return None

        return str(media_group_id)

    @property
    def media_name(self) -> Optional[str]:
        if not self.raw_data:
            return None

        document = self.raw_data.get("document")
        if document and document.get("file_name"):
            return str(document["file_name"])

        audio = self.raw_data.get("audio")
        if audio:
            if audio.get("file_name"):
                return str(audio["file_name"])
            if audio.get("title"):
                return str(audio["title"])

        voice = self.raw_data.get("voice")
        if voice and voice.get("file_unique_id"):
            return f"voice_{voice['file_unique_id']}"

        return None

    @property
    def media_size(self) -> Optional[int]:
        if not self.raw_data:
            return None

        for key in ("document", "audio", "voice", "video", "animation"):
            media = self.raw_data.get(key)
            if media and media.get("file_size") is not None:
                return int(media["file_size"])

        return None


class CommandScope(str, enum.Enum):
    """Область работы команды"""
    PRIVATE = "PRIVATE"  # Только в личных сообщениях
    GROUPS = "GROUPS"    # Только в группах/супергруппах
    ALL = "ALL"          # Везде (личные сообщения и группы)


class BotCommand(Base):
    """Модель команды бота (автоответы)"""
    __tablename__ = "bot_commands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    
    # Команда
    command: Mapped[str] = mapped_column(String(255), nullable=False, index=True)  # Например: /start, /help
    description: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    # Ответ
    response_text: Mapped[str] = mapped_column(Text, nullable=False)
    response_media_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    response_media_urls: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    response_media_type: Mapped[Optional[MessageType]] = mapped_column(SQLEnum(MessageType), nullable=True)
    response_buttons: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Inline keyboard

    # Настройки
    scope: Mapped[Optional[CommandScope]] = mapped_column(SQLEnum(CommandScope), nullable=True)  # Область работы команды
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Метаданные
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    bot = relationship("Bot", back_populates="commands")


class AutoReply(Base):
    """Модель автоответа на ключевые слова"""
    __tablename__ = "bot_auto_replies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    
    # Триггеры
    keywords: Mapped[list] = mapped_column(JSON, nullable=False)  # Список ключевых слов
    
    # Ответ
    response_text: Mapped[str] = mapped_column(Text, nullable=False)
    response_media_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    response_media_urls: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    response_media_type: Mapped[Optional[MessageType]] = mapped_column(SQLEnum(MessageType), nullable=True)
    response_buttons: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Inline keyboard

    # Настройки
    scope: Mapped[Optional[CommandScope]] = mapped_column(SQLEnum(CommandScope), nullable=True)  # Область работы (PRIVATE, GROUPS, ALL)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Метаданные
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    bot = relationship("Bot", foreign_keys=[bot_id])


class PendingApproval(Base):
    """Модель для хранения ожидающих одобрения заявок с капчей"""
    __tablename__ = "pending_approvals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    
    # Данные пользователя
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    chat_id: Mapped[int] = mapped_column(BigInteger, nullable=False)  # ID канала/группы
    
    # Капча
    captcha_question: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Вопрос капчи
    captcha_answer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Правильный ответ
    
    # Статус
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_rejected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Количество попыток
    
    # Метаданные
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)  # Срок действия капчи


class PendingJoinApproval(Base):
    """Ожидающие одобрения заявки (для автоодобрения при подписке)"""
    __tablename__ = "pending_join_approvals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    chat_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    missing_channels: Mapped[list] = mapped_column(JSON, nullable=False)  # список telegram_id каналов
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Trigger(Base):
    """Модель триггера для автоматизации действий"""
    __tablename__ = "bot_triggers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, index=True)

    # Тип события
    trigger_type: Mapped[TriggerType] = mapped_column(SQLEnum(TriggerType), nullable=False, index=True)

    # Название триггера для удобства
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Действие при срабатывании
    action_type: Mapped[TriggerActionType] = mapped_column(SQLEnum(TriggerActionType), nullable=False)

    # Данные для действия (текст сообщения, URL медиа, и т.д.)
    action_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # Пример: {"text": "Добро пожаловать!", "media_url": "...", "buttons": [...]}

    # Отложенный триггер: задержка в минутах (0 = сразу)
    delay_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Окно доставки (опционально)
    # Пример: {"start_hour": 9, "end_hour": 21, "timezone": "Europe/Moscow"}
    delivery_window: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Фильтры (опционально)
    # Пример: {"chat_ids": [123, 456], "user_ids": [789]}
    filters: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Тип чата для срабатывания
    chat_type: Mapped[TriggerChatType] = mapped_column(SQLEnum(TriggerChatType), default=TriggerChatType.BOTH, nullable=False)

    # Статус
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Метаданные
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    bot = relationship("Bot", foreign_keys=[bot_id])


class ScheduledTriggerTask(Base):
    """Отложенные задачи триггеров (для delayed triggers)"""
    __tablename__ = "scheduled_trigger_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trigger_id: Mapped[int] = mapped_column(Integer, ForeignKey("bot_triggers.id", ondelete="CASCADE"), nullable=False, index=True)

    # Данные для выполнения
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    chat_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Когда выполнить
    execute_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Статус
    is_executed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Контекст события (для передачи данных)
    event_context: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Метаданные
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    trigger = relationship("Trigger", foreign_keys=[trigger_id])


class RecurringMessageInterval(str, enum.Enum):
    """Интервал повторения"""
    HOURLY = "HOURLY"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    CUSTOM = "CUSTOM"


class RecurringMessage(Base):
    """Повторяющиеся сообщения для ботов"""
    __tablename__ = "recurring_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    text_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    media_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    media_type: Mapped[Optional[MessageType]] = mapped_column(SQLEnum(MessageType), nullable=True)
    inline_buttons: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    target_chats: Mapped[list] = mapped_column(JSON, nullable=False)
    
    interval_type: Mapped[RecurringMessageInterval] = mapped_column(SQLEnum(RecurringMessageInterval), nullable=False)
    interval_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    time_points: Mapped[list] = mapped_column(JSON, nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default='UTC', nullable=False)
    
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    weekdays: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    
    last_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_send_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    bot = relationship("Bot", foreign_keys=[bot_id])


class RecurringMessageLog(Base):
    """Лог отправок повторяющихся сообщений"""
    __tablename__ = "recurring_message_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recurring_message_id: Mapped[int] = mapped_column(Integer, ForeignKey("recurring_messages.id", ondelete="CASCADE"), nullable=False, index=True)
    
    chat_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    telegram_message_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

