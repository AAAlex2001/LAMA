import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    ForeignKey, BigInteger, Index, Enum as SAEnum
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from backend.models.bots import MessageType

from backend.models.base import Base

class DirectChat(Base):
    """DM-чат подписчика с ботом: профиль собеседника + превью последнего сообщения + unread counter. Уникальный по (bot_id, tg_chat_id)."""
    __tablename__ = "direct_chats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False, index=True)

    tg_chat_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    tg_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    
    tg_username: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tg_first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tg_last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tg_photo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    unread_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    last_message_text: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_message_type: Mapped[Optional[MessageType]] = mapped_column(SAEnum(MessageType), nullable=True)
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_direct_chats_bot_chat", "bot_id", "tg_chat_id", unique=True),
        Index("ix_direct_chats_bot_updated", "bot_id", "updated_at"),
    )
