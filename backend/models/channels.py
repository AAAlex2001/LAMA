from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, String, Boolean, BigInteger, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON, Index
from sqlalchemy.orm import relationship, Mapped, mapped_column
from backend.models.base import Base
import enum


class ChannelType(str, enum.Enum):
    CHANNEL = "CHANNEL"
    GROUP = "GROUP"
    SUPERGROUP = "SUPERGROUP"


class BackupMode(str, enum.Enum):
    DISABLED = "DISABLED"
    ENABLED = "ENABLED"
    INSTANT = "INSTANT"
    POST_FACTUM = "POST_FACTUM"


class BackupStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    IN_PROGRESS = "IN_PROGRESS"


class ActionType(str, enum.Enum):
    KICK = "KICK"
    MUTE = "MUTE"
    UNMUTE = "UNMUTE"
    DELETE = "DELETE"


class LinkFilterMode(str, enum.Enum):
    DISABLED = "DISABLED"
    BLOCK_ALL = "BLOCK_ALL"
    ALLOW_TME_ONLY = "ALLOW_TME_ONLY"
    WHITELIST = "WHITELIST"
    BLACKLIST = "BLACKLIST"


class ChannelGroup(Base):
    __tablename__ = "channel_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    bot_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("bots.id", ondelete="SET NULL"), index=True)
    is_bot_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    channel_type: Mapped[ChannelType] = mapped_column(SQLEnum(ChannelType))
    
    # Основная информация (ChatFullInfo)
    title: Mapped[str] = mapped_column(String(255))
    username: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(255))  # For private chats
    last_name: Mapped[Optional[str]] = mapped_column(String(255))  # For private chats
    description: Mapped[Optional[str]] = mapped_column(Text)
    invite_link: Mapped[Optional[str]] = mapped_column(String(500))
    bio: Mapped[Optional[str]] = mapped_column(Text)  # For private chats
    
    # Chat appearance
    accent_color_id: Mapped[Optional[int]] = mapped_column(Integer)
    profile_accent_color_id: Mapped[Optional[int]] = mapped_column(Integer)
    background_custom_emoji_id: Mapped[Optional[str]] = mapped_column(String(255))
    profile_background_custom_emoji_id: Mapped[Optional[str]] = mapped_column(String(255))
    emoji_status_custom_emoji_id: Mapped[Optional[str]] = mapped_column(String(255))
    emoji_status_expiration_date: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Chat settings/features
    is_forum: Mapped[bool] = mapped_column(Boolean, default=False)
    is_direct_messages: Mapped[bool] = mapped_column(Boolean, default=False)
    max_reaction_count: Mapped[Optional[int]] = mapped_column(Integer)
    slow_mode_delay: Mapped[Optional[int]] = mapped_column(Integer)
    unrestrict_boost_count: Mapped[Optional[int]] = mapped_column(Integer)
    message_auto_delete_time: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Privacy & restrictions
    has_private_forwards: Mapped[bool] = mapped_column(Boolean, default=False)
    has_restricted_voice_and_video_messages: Mapped[bool] = mapped_column(Boolean, default=False)
    has_aggressive_anti_spam_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    has_hidden_members: Mapped[bool] = mapped_column(Boolean, default=False)
    has_protected_content: Mapped[bool] = mapped_column(Boolean, default=False)
    has_visible_history: Mapped[bool] = mapped_column(Boolean, default=False)
    join_to_send_messages: Mapped[bool] = mapped_column(Boolean, default=False)
    join_by_request: Mapped[bool] = mapped_column(Boolean, default=False)
    can_send_paid_media: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Stickers
    sticker_set_name: Mapped[Optional[str]] = mapped_column(String(255))
    can_set_sticker_set: Mapped[bool] = mapped_column(Boolean, default=False)
    custom_emoji_sticker_set_name: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Linked chats & location
    linked_chat_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    parent_chat_id: Mapped[Optional[int]] = mapped_column(BigInteger)  # For direct messages chats
    location_address: Mapped[Optional[str]] = mapped_column(String(500))
    location_latitude: Mapped[Optional[str]] = mapped_column(String(50))
    location_longitude: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Статистика
    members_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Photo
    photo_url: Mapped[Optional[str]] = mapped_column(String(500))
    photo_small_file_id: Mapped[Optional[str]] = mapped_column(String(255))
    photo_small_file_unique_id: Mapped[Optional[str]] = mapped_column(String(255))
    photo_big_file_id: Mapped[Optional[str]] = mapped_column(String(255))
    photo_big_file_unique_id: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Chat permissions (JSON for flexibility)
    permissions: Mapped[Optional[dict]] = mapped_column(JSON)
    
    # Available reactions (JSON array)
    available_reactions: Mapped[Optional[list]] = mapped_column(JSON)
    
    # Accepted gift types (JSON)
    accepted_gift_types: Mapped[Optional[dict]] = mapped_column(JSON)
    
    # Active usernames (JSON array)
    active_usernames: Mapped[Optional[list]] = mapped_column(JSON)
    
    # Pinned message info (stored as JSON for simplicity)
    pinned_message: Mapped[Optional[dict]] = mapped_column(JSON)
    
    # Business account fields (JSON)
    business_intro: Mapped[Optional[dict]] = mapped_column(JSON)
    business_location: Mapped[Optional[dict]] = mapped_column(JSON)
    business_opening_hours: Mapped[Optional[dict]] = mapped_column(JSON)
    birthdate: Mapped[Optional[dict]] = mapped_column(JSON)
    personal_chat: Mapped[Optional[dict]] = mapped_column(JSON)
    
    # Настройки бекапа
    backup_mode: Mapped[BackupMode] = mapped_column(SQLEnum(BackupMode), default=BackupMode.DISABLED)
    backup_target_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("channel_groups.id", ondelete="SET NULL"))
    backup_target_ids: Mapped[Optional[list]] = mapped_column(JSON)
    backup_post_types: Mapped[Optional[list]] = mapped_column(JSON)
    backup_content_types: Mapped[Optional[list]] = mapped_column(JSON)
    backup_ai_prompt: Mapped[Optional[str]] = mapped_column(Text)
    
    # Настройки антиспама
    link_filter_mode: Mapped[LinkFilterMode] = mapped_column(SQLEnum(LinkFilterMode), default=LinkFilterMode.DISABLED)
    link_whitelist: Mapped[Optional[list]] = mapped_column(JSON)
    link_blacklist: Mapped[Optional[list]] = mapped_column(JSON)
    link_filter_action: Mapped[ActionType] = mapped_column(SQLEnum(ActionType), default=ActionType.DELETE)
    link_filter_mute_duration: Mapped[Optional[int]] = mapped_column(Integer)

    # Night mode settings
    night_mode_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    night_mode_start: Mapped[Optional[str]] = mapped_column(String(5))
    night_mode_end: Mapped[Optional[str]] = mapped_column(String(5))
    night_mode_block_media: Mapped[bool] = mapped_column(Boolean, default=False)
    night_mode_block_text: Mapped[bool] = mapped_column(Boolean, default=False)

    # Запрещённые слова
    banned_words_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Быстрые команды
    commands_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    enabled_commands: Mapped[Optional[list]] = mapped_column(JSON)

    # Блокировка медиа
    block_media_types: Mapped[Optional[list]] = mapped_column(JSON)

    # Настройки антифлуда
    flood_message_limit: Mapped[Optional[int]] = mapped_column(Integer)  # N сообщений
    flood_interval_seconds: Mapped[Optional[int]] = mapped_column(Integer)  # за M секунд
    flood_action: Mapped[ActionType] = mapped_column(SQLEnum(ActionType), default=ActionType.MUTE)
    flood_mute_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Метаданные
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Дополнительные данные из TG API (для полей, которые не вошли в структуру)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON)
    
    # Relationships
    owner = relationship("User", back_populates="channel_groups")
    bot = relationship("Bot", foreign_keys=[bot_id])
    backup_target = relationship("ChannelGroup", remote_side=[id], foreign_keys=[backup_target_id])
    backed_up_posts = relationship("BackedUpPost", back_populates="channel", cascade="all, delete-orphan")
    backup_jobs = relationship("BackupJob", back_populates="source_channel", foreign_keys="BackupJob.source_channel_id", cascade="all, delete-orphan")
    publications = relationship("Publication", secondary="publication_channels", back_populates="channels")
    telegram_messages = relationship("TelegramMessage", back_populates="channel", cascade="all, delete-orphan")
    moderation_rules = relationship("ChannelModerationRule", back_populates="channel", cascade="all, delete-orphan")
    auto_delete_settings = relationship(
        "ChannelAutoDeleteSettings",
        back_populates="channel",
        uselist=False,
        cascade="all, delete-orphan"
    )
    invite_links = relationship(
        "ChatInviteLink",
        back_populates="channel",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_channel_groups_backup_mode", "backup_mode"),
        Index("ix_channel_groups_is_active", "is_active"),
    )


class BackedUpPost(Base):
    __tablename__ = "backed_up_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    channel_id: Mapped[int] = mapped_column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"))
    telegram_message_id: Mapped[int] = mapped_column(BigInteger)
    media_group_id: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Контент поста
    content_type: Mapped[str] = mapped_column(String(50))
    text_content: Mapped[Optional[str]] = mapped_column(Text)
    media_urls: Mapped[Optional[list]] = mapped_column(JSON)
    media_file_ids: Mapped[Optional[list]] = mapped_column(JSON)
    
    # Метаданные поста
    has_spoiler: Mapped[bool] = mapped_column(Boolean, default=False)
    reply_markup: Mapped[Optional[dict]] = mapped_column(JSON)
    views_count: Mapped[int] = mapped_column(Integer, default=0)
    forwards_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Временные метки
    original_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    backed_up_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Полный JSON от Telegram
    raw_data: Mapped[dict] = mapped_column(JSON)
    
    # Relationships
    channel = relationship("ChannelGroup", back_populates="backed_up_posts")
    retransmissions = relationship("PostRetransmission", back_populates="original_post", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_backed_up_posts_channel_message", "channel_id", "telegram_message_id", unique=True),
        Index("ix_backed_up_posts_media_group", "channel_id", "media_group_id"),
        Index("ix_backed_up_posts_original_date", "original_date"),
    )


class PostRetransmission(Base):
    __tablename__ = "post_retransmissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    original_post_id: Mapped[int] = mapped_column(Integer, ForeignKey("backed_up_posts.id", ondelete="CASCADE"))
    target_channel_id: Mapped[int] = mapped_column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"))
    target_message_id: Mapped[int] = mapped_column(BigInteger)
    
    retransmitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    original_post = relationship("BackedUpPost", back_populates="retransmissions")
    target_channel = relationship("ChannelGroup", foreign_keys=[target_channel_id])

    __table_args__ = (
        Index("ix_post_retransmissions_original", "original_post_id"),
        Index("ix_post_retransmissions_target", "target_channel_id"),
    )


class BackupJob(Base):
    __tablename__ = "backup_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    source_channel_id: Mapped[int] = mapped_column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"))
    target_channel_id: Mapped[int] = mapped_column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"))
    
    status: Mapped[BackupStatus] = mapped_column(SQLEnum(BackupStatus), default=BackupStatus.IN_PROGRESS)

    # Фильтры восстановления
    content_types: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    filter_start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    filter_end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Прогресс
    total_posts: Mapped[int] = mapped_column(Integer, default=0)
    processed_posts: Mapped[int] = mapped_column(Integer, default=0)
    failed_posts: Mapped[int] = mapped_column(Integer, default=0)

    # Временные рамки
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    error_details: Mapped[Optional[dict]] = mapped_column(JSON)
    
    # Relationships
    source_channel = relationship("ChannelGroup", foreign_keys=[source_channel_id], back_populates="backup_jobs")
    target_channel = relationship("ChannelGroup", foreign_keys=[target_channel_id])

    __table_args__ = (
        Index("ix_backup_jobs_status", "status"),
        Index("ix_backup_jobs_started_at", "started_at"),
    )

class ChannelModerationRule(Base):
    __tablename__ = "channel_moderation_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    phrase: Mapped[str] = mapped_column(Text)

    action: Mapped[ActionType] = mapped_column(SQLEnum(ActionType))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    mute_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)

    channel_id: Mapped[int] = mapped_column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"))

    channel = relationship("ChannelGroup", back_populates="moderation_rules")


class ChannelFloodState(Base):
    __tablename__ = "channel_flood_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    channel_id: Mapped[int] = mapped_column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(BigInteger)

    message_count: Mapped[int] = mapped_column(Integer, default=0)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    channel = relationship("ChannelGroup")

    __table_args__ = (
        Index("ix_channel_flood_states_channel_user", "channel_id", "user_id", unique=True),
    )


class ChannelAutoDeleteSettings(Base):
    __tablename__ = "channel_auto_delete_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    channel_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("channel_groups.id", ondelete="CASCADE"),
        unique=True,
    )
    delete_system_messages: Mapped[bool] = mapped_column(Boolean, default=False)
    delete_command_messages: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    channel = relationship("ChannelGroup", back_populates="auto_delete_settings")


class ChatInviteLink(Base):
    """Пригласительные ссылки для каналов/групп"""
    __tablename__ = "chat_invite_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    channel_id: Mapped[int] = mapped_column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"), index=True)
    
    # Данные ссылки из Telegram API
    invite_link: Mapped[str] = mapped_column(String(500), unique=True)
    name: Mapped[Optional[str]] = mapped_column(String(255))
    creator_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    
    # Настройки ссылки
    creates_join_request: Mapped[bool] = mapped_column(Boolean, default=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Лимиты
    expire_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    member_limit: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Метрики (обновляются при синхронизации)
    pending_join_request_count: Mapped[int] = mapped_column(Integer, default=0)
    member_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Для подписных ссылок
    subscription_period: Mapped[Optional[int]] = mapped_column(Integer)
    subscription_price: Mapped[Optional[int]] = mapped_column(Integer)

    # Настройки защиты и входа (хранятся в нашей БД, не в Telegram)
    protection_type: Mapped[Optional[str]] = mapped_column(String(32), default="none")    # none | captcha
    entry_method: Mapped[Optional[str]] = mapped_column(String(32), default="direct")     # direct | bot

    # Метаданные
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    channel = relationship("ChannelGroup", back_populates="invite_links")


