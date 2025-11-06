from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    String,
    Integer,
    Text,
    Boolean,
    ForeignKey,
    DateTime,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from backend.models.channel import ChannelType, BackupMode


class Base(DeclarativeBase):
    pass


class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    telegram_chat_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    bot_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    type: Mapped[ChannelType] = mapped_column(String(16), nullable=False, default=ChannelType.CHANNEL.value)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    members_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    backup_mode: Mapped[BackupMode] = mapped_column(String(16), nullable=False, default=BackupMode.DISABLED.value)
    backup_channel_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    auto_sync: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    backup_posts: Mapped[list["BackupPost"]] = relationship(
        back_populates="channel", cascade="all, delete-orphan"
    )


class BackupPost(Base):
    __tablename__ = "backup_posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"), index=True)
    message_id: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    media: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    inline_buttons: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    original_chat_id: Mapped[str] = mapped_column(String(128), nullable=False)

    channel: Mapped[Channel] = relationship(back_populates="backup_posts")


__all__ = ["Base", "Channel", "BackupPost"]


