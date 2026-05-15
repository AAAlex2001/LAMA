from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, BigInteger, Text, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from backend.models.base import Base
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventType, EventStatus

class InboxEvent(Base):
    """Событие inbox: join-request / ban / link-join / триггер / автоответ / команда / ошибка."""

    __tablename__ = "inbox_events"
    __table_args__ = (
        Index("ix_inbox_events_owner_created", "owner_id", "created_at"),
        Index("ix_inbox_events_owner_status_created", "owner_id", "status", "created_at"),
        Index("ix_inbox_events_owner_category_created", "owner_id", "category", "created_at"),
    )

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

    payload = Column(JSONB, default=dict, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
