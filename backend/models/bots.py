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


class ApprovalMode(str, enum.Enum):
    """Режим одобрения заявок"""
    AUTO = "AUTO"  # Автоматическое одобрение всех
    MANUAL = "MANUAL"  # Ручное одобрение
    CRITERIA = "CRITERIA"  # По критериям (подписка на другие каналы и т.д.)


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
    
    # Telegram данные
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
    first_name = Column(String(255), nullable=False)
    token = Column(String(255), unique=True, nullable=False)  # Храним токен для работы
    
    # Информация о боте
    description = Column(Text, nullable=True)
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
    
    # Настройки автоодобрения
    auto_approval_mode = Column(SQLEnum(ApprovalMode), default=ApprovalMode.MANUAL, nullable=False)
    approval_criteria = Column(JSON, nullable=True)  # Критерии для одобрения
    
    # Метаданные
    last_update_id = Column(Integer, default=0, nullable=False)  # Для long polling
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
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
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Метаданные
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    bot = relationship("Bot", back_populates="commands")

