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


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    telegram_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, unique=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    user: Mapped[User] = relationship()


# ==== Bots module ====

class Bot(Base):
    __tablename__ = "bots"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # Telegram bot ID as string
    token: Mapped[str] = mapped_column(Text, nullable=False)
    username: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description_suffix: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    welcome_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    welcome_mode: Mapped[str] = mapped_column(String(16), nullable=False, default="manual")
    welcome_greet_message: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    welcome_rules_message: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    welcome_allow_rules: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    working_chats: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    branch_map: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    total_users: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    blocked_users: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deliveries_ok: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deliveries_fail: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class BotCommand(Base):
    __tablename__ = "bot_commands"

    bot_id: Mapped[str] = mapped_column(String(64), ForeignKey("bots.id", ondelete="CASCADE"), primary_key=True)
    command: Mapped[str] = mapped_column(String(64), primary_key=True)
    response: Mapped[dict] = mapped_column(JSONB, nullable=False)


class BotTemplate(Base):
    __tablename__ = "bot_templates"

    bot_id: Mapped[str] = mapped_column(String(64), ForeignKey("bots.id", ondelete="CASCADE"), primary_key=True)
    template_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    message: Mapped[dict] = mapped_column(JSONB, nullable=False)


class BotTriggerConfig(Base):
    __tablename__ = "bot_trigger_configs"

    bot_id: Mapped[str] = mapped_column(String(64), ForeignKey("bots.id", ondelete="CASCADE"), primary_key=True)
    trigger_type: Mapped[str] = mapped_column(String(64), primary_key=True)
    config: Mapped[dict] = mapped_column(JSONB, nullable=False)


class BotApplicant(Base):
    __tablename__ = "bot_applicants"

    bot_id: Mapped[str] = mapped_column(String(64), ForeignKey("bots.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    chat_id: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    declined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class BotCaptchaState(Base):
    __tablename__ = "bot_captcha_states"

    bot_id: Mapped[str] = mapped_column(String(64), ForeignKey("bots.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, default="simple_button")
    challenge_sent_message_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class BotInboxMessage(Base):
    __tablename__ = "bot_inbox"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bot_id: Mapped[str] = mapped_column(String(64), ForeignKey("bots.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    direction: Mapped[str] = mapped_column(String(8), nullable=False)  # in/out
    text: Mapped[str] = mapped_column(Text, nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class BotCallbackClick(Base):
    __tablename__ = "bot_callback_clicks"

    bot_id: Mapped[str] = mapped_column(String(64), ForeignKey("bots.id", ondelete="CASCADE"), primary_key=True)
    data: Mapped[str] = mapped_column(String(256), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class BotUserSeriesProgress(Base):
    __tablename__ = "bot_user_series_progress"

    bot_id: Mapped[str] = mapped_column(String(64), ForeignKey("bots.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    series_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


__all__ = [
    "Base",
    "Channel",
    "BackupPost",
    "User",
    "RefreshToken",
    "Bot",
    "BotCommand",
    "BotTemplate",
    "BotTriggerConfig",
    "BotApplicant",
    "BotCaptchaState",
    "BotInboxMessage",
    "BotCallbackClick",
    "BotUserSeriesProgress",
]

