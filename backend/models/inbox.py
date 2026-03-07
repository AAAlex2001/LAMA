from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, BigInteger, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
import enum

from backend.models.base import Base

class InboxCategory(str, enum.Enum):
    MODERATION = "moderation"
    SYSTEM = "system"
    AUTOMATION = "automation"

class EntityType(str, enum.Enum):
    BOT = "bot"
    CHANNEL = "channel"
    SYSTEM = "system"

class EventType(str, enum.Enum):
    BOT_MESSAGE = "bot_message"
    BOT_COMMAND = "bot_command"
    BOT_ERROR = "bot_error"

    CHANNEL_COMMENT = "channel_comment"
    CHANNEL_JOIN_REQUEST = "channel_join_request"
    CHANNEL_LINK_JOIN = "channel_link_join"
    CHANNEL_BAN = "channel_ban"

    SYSTEM_NOTIFICATION = "system_notification"
    SYSTEM_TRIGGER = "system_trigger"
    SYSTEM_AUTOREPLY = "system_autoreply"
    SYSTEM_UPDATE = "system_update"

class EventStatus(str, enum.Enum):
    NEW = "new"
    PROCESSED = "processed"
    IGNORED = "ignored"

class InboxEvent(Base):
    __tablename__ = "inbox_events"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    category = Column(SQLEnum(InboxCategory, name="inboxcategory", create_type=False), nullable=False, index=True)
    entity_type = Column(SQLEnum(EntityType, name="entitytype", create_type=False), nullable=False)
    event_type = Column(SQLEnum(EventType, name="eventtype", create_type=False), nullable=False)

    bot_id = Column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=True)
    channel_id = Column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"), nullable=True)

    tg_user_id = Column(BigInteger, nullable=True)
    tg_username = Column(String, nullable=True)

    status = Column(SQLEnum(EventStatus, name="eventstatus", create_type=False), default=EventStatus.NEW, nullable=False, index=True)
    description = Column(Text, nullable=True)

    payload = Column(JSONB, default={}, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
