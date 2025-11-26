from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, BigInteger, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON, Index
from sqlalchemy.orm import relationship
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

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id", ondelete="SET NULL"), nullable=True, index=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    channel_type = Column(SQLEnum(ChannelType), nullable=False)
    
    # Основная информация (ChatFullInfo)
    title = Column(String(255), nullable=False)
    username = Column(String(255), nullable=True, index=True)
    first_name = Column(String(255), nullable=True)  # For private chats
    last_name = Column(String(255), nullable=True)  # For private chats
    description = Column(Text, nullable=True)
    invite_link = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)  # For private chats
    
    # Chat appearance
    accent_color_id = Column(Integer, nullable=True)
    profile_accent_color_id = Column(Integer, nullable=True)
    background_custom_emoji_id = Column(String(255), nullable=True)
    profile_background_custom_emoji_id = Column(String(255), nullable=True)
    emoji_status_custom_emoji_id = Column(String(255), nullable=True)
    emoji_status_expiration_date = Column(Integer, nullable=True)
    
    # Chat settings/features
    is_forum = Column(Boolean, default=False)
    is_direct_messages = Column(Boolean, default=False)
    max_reaction_count = Column(Integer, nullable=True)
    slow_mode_delay = Column(Integer, nullable=True)
    unrestrict_boost_count = Column(Integer, nullable=True)
    message_auto_delete_time = Column(Integer, nullable=True)
    
    # Privacy & restrictions
    has_private_forwards = Column(Boolean, default=False)
    has_restricted_voice_and_video_messages = Column(Boolean, default=False)
    has_aggressive_anti_spam_enabled = Column(Boolean, default=False)
    has_hidden_members = Column(Boolean, default=False)
    has_protected_content = Column(Boolean, default=False)
    has_visible_history = Column(Boolean, default=False)
    join_to_send_messages = Column(Boolean, default=False)
    join_by_request = Column(Boolean, default=False)
    can_send_paid_media = Column(Boolean, default=False)
    
    # Stickers
    sticker_set_name = Column(String(255), nullable=True)
    can_set_sticker_set = Column(Boolean, default=False)
    custom_emoji_sticker_set_name = Column(String(255), nullable=True)
    
    # Linked chats & location
    linked_chat_id = Column(BigInteger, nullable=True)
    parent_chat_id = Column(BigInteger, nullable=True)  # For direct messages chats
    location_address = Column(String(500), nullable=True)
    location_latitude = Column(String(50), nullable=True)
    location_longitude = Column(String(50), nullable=True)
    
    # Статистика
    members_count = Column(Integer, default=0)
    
    # Photo
    photo_url = Column(String(500), nullable=True)
    photo_small_file_id = Column(String(255), nullable=True)
    photo_small_file_unique_id = Column(String(255), nullable=True)
    photo_big_file_id = Column(String(255), nullable=True)
    photo_big_file_unique_id = Column(String(255), nullable=True)
    
    # Chat permissions (JSON for flexibility)
    permissions = Column(JSON, nullable=True)
    
    # Available reactions (JSON array)
    available_reactions = Column(JSON, nullable=True)
    
    # Accepted gift types (JSON)
    accepted_gift_types = Column(JSON, nullable=True)
    
    # Active usernames (JSON array)
    active_usernames = Column(JSON, nullable=True)
    
    # Pinned message info (stored as JSON for simplicity)
    pinned_message = Column(JSON, nullable=True)
    
    # Business account fields (JSON)
    business_intro = Column(JSON, nullable=True)
    business_location = Column(JSON, nullable=True)
    business_opening_hours = Column(JSON, nullable=True)
    birthdate = Column(JSON, nullable=True)
    personal_chat = Column(JSON, nullable=True)
    
    # Настройки бекапа
    backup_mode = Column(SQLEnum(BackupMode), default=BackupMode.DISABLED, nullable=False)
    backup_target_id = Column(Integer, ForeignKey("channel_groups.id", ondelete="SET NULL"), nullable=True)
    
    # Настройки антиспама
    link_filter_mode = Column(SQLEnum(LinkFilterMode), default=LinkFilterMode.DISABLED, nullable=False)
    link_whitelist = Column(JSON, nullable=True)
    link_blacklist = Column(JSON, nullable=True)
    link_filter_action = Column(SQLEnum(ActionType), default=ActionType.DELETE, nullable=False)
    link_filter_mute_duration = Column(Integer, nullable=True)

    # Настройки антифлуда
    flood_message_limit = Column(Integer, nullable=True)  # N сообщений
    flood_interval_seconds = Column(Integer, nullable=True)  # за M секунд
    flood_action = Column(SQLEnum(ActionType), default=ActionType.MUTE, nullable=False)
    flood_mute_duration_minutes = Column(Integer, nullable=True)
    
    # Метаданные
    is_active = Column(Boolean, default=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Дополнительные данные из TG API (для полей, которые не вошли в структуру)
    extra_data = Column(JSON, nullable=True)
    
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

    __table_args__ = (
        Index("ix_channel_groups_backup_mode", "backup_mode"),
        Index("ix_channel_groups_is_active", "is_active"),
    )


class BackedUpPost(Base):
    __tablename__ = "backed_up_posts"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"), nullable=False)
    telegram_message_id = Column(BigInteger, nullable=False)
    media_group_id = Column(String(255), nullable=True)
    
    # Контент поста
    content_type = Column(String(50), nullable=False)
    text_content = Column(Text, nullable=True)
    media_urls = Column(JSON, nullable=True)
    media_file_ids = Column(JSON, nullable=True)
    
    # Метаданные поста
    has_spoiler = Column(Boolean, default=False)
    reply_markup = Column(JSON, nullable=True)
    views_count = Column(Integer, default=0)
    forwards_count = Column(Integer, default=0)
    
    # Временные метки
    original_date = Column(DateTime(timezone=True), nullable=False)
    backed_up_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Полный JSON от Telegram
    raw_data = Column(JSON, nullable=False)
    
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

    id = Column(Integer, primary_key=True, index=True)
    original_post_id = Column(Integer, ForeignKey("backed_up_posts.id", ondelete="CASCADE"), nullable=False)
    target_channel_id = Column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"), nullable=False)
    target_message_id = Column(BigInteger, nullable=False)
    
    retransmitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    original_post = relationship("BackedUpPost", back_populates="retransmissions")
    target_channel = relationship("ChannelGroup", foreign_keys=[target_channel_id])

    __table_args__ = (
        Index("ix_post_retransmissions_original", "original_post_id"),
        Index("ix_post_retransmissions_target", "target_channel_id"),
    )


class BackupJob(Base):
    __tablename__ = "backup_jobs"

    id = Column(Integer, primary_key=True, index=True)
    source_channel_id = Column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"), nullable=False)
    target_channel_id = Column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"), nullable=False)
    
    status = Column(SQLEnum(BackupStatus), default=BackupStatus.IN_PROGRESS, nullable=False)
    
    # Прогресс
    total_posts = Column(Integer, default=0)
    processed_posts = Column(Integer, default=0)
    failed_posts = Column(Integer, default=0)
    
    # Временные рамки
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    error_details = Column(JSON, nullable=True)
    
    # Relationships
    source_channel = relationship("ChannelGroup", foreign_keys=[source_channel_id], back_populates="backup_jobs")
    target_channel = relationship("ChannelGroup", foreign_keys=[target_channel_id])

    __table_args__ = (
        Index("ix_backup_jobs_status", "status"),
        Index("ix_backup_jobs_started_at", "started_at"),
    )

class ChannelModerationRule(Base):
    __tablename__ = "channel_moderation_rules"

    id = Column(Integer, primary_key=True, index=True)
    phrase = Column(Text, nullable=False)

    action = Column(SQLEnum(ActionType), nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    mute_duration_minutes = Column(Integer, nullable=True)

    channel_id = Column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"), nullable=False)

    channel = relationship("ChannelGroup", back_populates="moderation_rules")


class ChannelFloodState(Base):
    __tablename__ = "channel_flood_states"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channel_groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, nullable=False)

    message_count = Column(Integer, default=0, nullable=False)
    window_start = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_message_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    channel = relationship("ChannelGroup")

    __table_args__ = (
        Index("ix_channel_flood_states_channel_user", "channel_id", "user_id", unique=True),
    )


class ChannelAutoDeleteSettings(Base):
    __tablename__ = "channel_auto_delete_settings"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(
        Integer,
        ForeignKey("channel_groups.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    delete_system_messages = Column(Boolean, default=False, nullable=False)
    delete_command_messages = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    channel = relationship("ChannelGroup", back_populates="auto_delete_settings")


