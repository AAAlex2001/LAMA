"""
Модели для работы с ботами
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

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


class Bot(Base):
    """Модель бота"""
    __tablename__ = "bots"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Telegram данные
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
    first_name = Column(String(255), nullable=False)
    token = Column(String(255), unique=True, nullable=False)  # Храним токен для работы
    
    # Информация о боте
    description = Column(Text, nullable=True)
    short_description = Column(String(256), nullable=True)
    photo_url = Column(String(512), nullable=True)
    
    # Статус
    status = Column(SQLEnum(BotStatus), default=BotStatus.ACTIVE, nullable=False)
    is_webhook_enabled = Column(Boolean, default=False, nullable=False)
    webhook_url = Column(String(512), nullable=True)
    
    # Настройки приветствия
    welcome_enabled = Column(Boolean, default=False, nullable=False)
    welcome_message = Column(Text, nullable=True)
    welcome_media_url = Column(String(512), nullable=True)
    welcome_media_type = Column(SQLEnum(MessageType), nullable=True)
    welcome_buttons = Column(JSON, nullable=True)  # Inline keyboard
    welcome_message_thread_id = Column(BigInteger, nullable=True)  # ID топика для групповых приветствий
    
    # Капча (два режима)
    join_captcha_enabled = Column(Boolean, default=False, nullable=False)  # Старое поле для обратной совместимости
    captcha_mode = Column(SQLEnum(CaptchaMode), default=CaptchaMode.DISABLED, nullable=False)  # Новое поле
    captcha_timeout_seconds = Column(Integer, default=10, nullable=False)  # Таймаут для капчи в группе
    
    # Настройки автоодобрения
    auto_approval_mode = Column(SQLEnum(ApprovalMode), default=ApprovalMode.MANUAL, nullable=False)
    approval_criteria = Column(JSON, nullable=True)  # Критерии для одобрения
    
    # Метаданные
    last_update_id = Column(Integer, default=0, nullable=False)  # Для long polling (bot updates)
    last_channel_update_id = Column(Integer, default=0, nullable=False)  # Для long polling (channel posts)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="bots")
    messages = relationship("BotMessage", back_populates="bot", cascade="all, delete-orphan")
    commands = relationship("BotCommand", back_populates="bot", cascade="all, delete-orphan")


class BotMessage(Base):
    """Модель сообщения бота"""
    __tablename__ = "bot_messages"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    
    # Telegram данные
    telegram_message_id = Column(Integer, nullable=False)
    chat_id = Column(BigInteger, nullable=False, index=True)
    user_id = Column(BigInteger, nullable=True, index=True)  # ID пользователя, если есть
    
    # Содержимое
    message_type = Column(SQLEnum(MessageType), default=MessageType.TEXT, nullable=False)
    text_content = Column(Text, nullable=True)
    media_file_id = Column(String(255), nullable=True)
    media_url = Column(String(512), nullable=True)
    
    # Направление
    is_incoming = Column(Boolean, default=True, nullable=False)  # True = от пользователя, False = от бота
    
    # Метаданные
    raw_data = Column(JSON, nullable=True)  # Полные данные сообщения
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    bot = relationship("Bot", back_populates="messages")


class CommandScope(str, enum.Enum):
    """Область работы команды"""
    PRIVATE = "PRIVATE"  # Только в личных сообщениях
    GROUPS = "GROUPS"    # Только в группах/супергруппах
    ALL = "ALL"          # Везде (личные сообщения и группы)


class BotCommand(Base):
    """Модель команды бота (автоответы)"""
    __tablename__ = "bot_commands"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    
    # Команда
    command = Column(String(255), nullable=False, index=True)  # Например: /start, /help
    description = Column(String(512), nullable=True)
    
    # Ответ
    response_text = Column(Text, nullable=False)
    response_media_url = Column(String(512), nullable=True)
    response_media_type = Column(SQLEnum(MessageType), nullable=True)
    response_buttons = Column(JSON, nullable=True)  # Inline keyboard
    
    # Настройки
    scope = Column(SQLEnum(CommandScope), nullable=True)  # Область работы команды
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Метаданные
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    bot = relationship("Bot", back_populates="commands")


class AutoReply(Base):
    """Модель автоответа на ключевые слова"""
    __tablename__ = "bot_auto_replies"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    
    # Триггеры
    keywords = Column(JSON, nullable=False)  # Список ключевых слов
    
    # Ответ
    response_text = Column(Text, nullable=False)
    response_media_url = Column(String(512), nullable=True)
    response_media_type = Column(SQLEnum(MessageType), nullable=True)
    response_buttons = Column(JSON, nullable=True)  # Inline keyboard
    
    # Настройки
    scope = Column(SQLEnum(CommandScope), nullable=True)  # Область работы (PRIVATE, GROUPS, ALL)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Метаданные
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    bot = relationship("Bot", foreign_keys=[bot_id])


class PendingApproval(Base):
    """Модель для хранения ожидающих одобрения заявок с капчей"""
    __tablename__ = "pending_approvals"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    
    # Данные пользователя
    user_id = Column(BigInteger, nullable=False, index=True)
    chat_id = Column(BigInteger, nullable=False)  # ID канала/группы
    
    # Капча
    captcha_question = Column(String(255), nullable=True)  # Вопрос капчи
    captcha_answer = Column(String(255), nullable=True)  # Правильный ответ
    
    # Статус
    is_approved = Column(Boolean, default=False, nullable=False)
    is_rejected = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)  # Количество попыток
    
    # Метаданные
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Срок действия капчи


class PendingJoinApproval(Base):
    """Ожидающие одобрения заявки (для автоодобрения при подписке)"""
    __tablename__ = "pending_join_approvals"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    chat_id = Column(BigInteger, nullable=False)
    missing_channels = Column(JSON, nullable=False)  # список telegram_id каналов
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Trigger(Base):
    """Модель триггера для автоматизации действий"""
    __tablename__ = "bot_triggers"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, index=True)

    # Тип события
    trigger_type = Column(SQLEnum(TriggerType), nullable=False, index=True)

    # Название триггера для удобства
    name = Column(String(255), nullable=False)

    # Действие при срабатывании
    action_type = Column(SQLEnum(TriggerActionType), nullable=False)

    # Данные для действия (текст сообщения, URL медиа, и т.д.)
    action_data = Column(JSON, nullable=True)
    # Пример: {"text": "Добро пожаловать!", "media_url": "...", "buttons": [...]}

    # Отложенный триггер: задержка в минутах (0 = сразу)
    delay_minutes = Column(Integer, default=0, nullable=False)

    # Окно доставки (опционально)
    # Пример: {"start_hour": 9, "end_hour": 21, "timezone": "Europe/Moscow"}
    delivery_window = Column(JSON, nullable=True)

    # Фильтры (опционально)
    # Пример: {"chat_ids": [123, 456], "user_ids": [789]}
    filters = Column(JSON, nullable=True)

    # Статус
    is_active = Column(Boolean, default=True, nullable=False)

    # Метаданные
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    bot = relationship("Bot", foreign_keys=[bot_id])


class ScheduledTriggerTask(Base):
    """Отложенные задачи триггеров (для delayed triggers)"""
    __tablename__ = "scheduled_trigger_tasks"

    id = Column(Integer, primary_key=True, index=True)
    trigger_id = Column(Integer, ForeignKey("bot_triggers.id", ondelete="CASCADE"), nullable=False, index=True)

    # Данные для выполнения
    user_id = Column(BigInteger, nullable=False, index=True)
    chat_id = Column(BigInteger, nullable=False)

    # Когда выполнить
    execute_at = Column(DateTime(timezone=True), nullable=False, index=True)

    # Статус
    is_executed = Column(Boolean, default=False, nullable=False)
    executed_at = Column(DateTime(timezone=True), nullable=True)

    # Контекст события (для передачи данных)
    event_context = Column(JSON, nullable=True)

    # Метаданные
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    trigger = relationship("Trigger", foreign_keys=[trigger_id])

