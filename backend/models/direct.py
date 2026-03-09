import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    ForeignKey, BigInteger, Index
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from backend.models.base import Base

class DirectChat(Base):
    """Модель чата пользователя с ботом."""
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
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_direct_chats_bot_chat", "bot_id", "tg_chat_id", unique=True),
    )
