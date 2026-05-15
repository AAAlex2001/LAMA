from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Enum as SQLEnum, Table, func, Column, Index, BigInteger
import sqlalchemy as sa
from sqlalchemy.orm import relationship, Mapped, mapped_column
from backend.models.base import Base
import enum
import secrets


class PublicationStatus(enum.Enum):
    """Статус публикации: DRAFT / SCHEDULED / PUBLISHED / PARTIAL_SUCCESS / FAILED / DELETED."""

    DRAFT = "draft"  # Черновик (не запланирована)
    SCHEDULED = "scheduled"  # Запланирована, ждёт scheduled_time
    PUBLISHED = "published"  # Опубликована во все каналы
    PARTIAL_SUCCESS = "partial_success"  # Часть каналов получила, часть нет
    FAILED = "failed"  # Полная неудача публикации
    DELETED = "deleted"  # Удалена (soft delete)


class ContentType(enum.Enum):
    """Тип контента: TEXT / TEXT_WITH_MEDIA / IMAGE / VIDEO / AUDIO / DOCUMENT / LINK / POLL / QUIZ."""

    TEXT = "text"  # Только текст
    TEXT_WITH_MEDIA = "text_with_media"  # Текст + медиа (одно или альбом)
    IMAGE = "image"  # Фото
    VIDEO = "video"  # Видео
    AUDIO = "audio"  # Аудио
    DOCUMENT = "document"  # Документ/файл
    LINK = "link"  # Ссылка с превью
    POLL = "poll"  # Опрос
    QUIZ = "quiz"  # Квиз (опрос с правильным ответом)


class RepeatInterval(enum.Enum):
    """Интервал повторения: NEVER / DAILY / WEEKLY / BIWEEKLY / MONTHLY / YEARLY / CUSTOM."""
    NEVER = "never"  # Не повторять
    DAILY = "daily"  # Каждый день
    WEEKLY = "weekly"  # Каждую неделю
    BIWEEKLY = "biweekly"  # Раз в 2 недели
    MONTHLY = "monthly"  # Каждый месяц
    YEARLY = "yearly"  # Каждый год
    CUSTOM = "custom"  # Кастомный интервал (repeat_custom_*)


publication_tags = Table(
    'publication_tags',
    Base.metadata,
    Column('publication_id', Integer, ForeignKey('publications.id', ondelete='CASCADE'), index=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), index=True),
    Index('ix_publication_tags_pub_tag', 'publication_id', 'tag_id', unique=True),
)


publication_channels = Table(
    'publication_channels',
    Base.metadata,
    Column('publication_id', Integer, ForeignKey('publications.id', ondelete='CASCADE'), index=True),
    Column('channel_id', Integer, ForeignKey('channel_groups.id', ondelete='CASCADE'), index=True),
    Index('ix_publication_channels_pub_ch', 'publication_id', 'channel_id', unique=True),
)


class Publication(Base):
    """Публикация (главная сущность): контент + расписание + повторения + каналы + теги."""

    __tablename__ = 'publications'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_type: Mapped[ContentType] = mapped_column(SQLEnum(ContentType))
    status: Mapped[PublicationStatus] = mapped_column(SQLEnum(PublicationStatus), default=PublicationStatus.DRAFT, index=True)
    
    text_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    formatted_content: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    media_urls: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    media_thumbnail_urls: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    media_file_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    media_blur: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    inline_keyboard: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    poll_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    pin_message: Mapped[bool] = mapped_column(Boolean, default=False)
    disable_notification: Mapped[bool] = mapped_column(Boolean, default=False)
    disable_web_page_preview: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_delete_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    auto_delete_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    repeat_interval: Mapped[RepeatInterval] = mapped_column(
        SQLEnum(RepeatInterval, values_callable=lambda x: [e.value for e in x]),
        default=RepeatInterval.NEVER
    )
    repeat_custom_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    repeat_custom_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    repeat_custom_unit: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    repeat_custom_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    repeat_weekdays: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    repeat_month_days: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    repeat_year_month: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    repeat_year_days: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    repeat_excluded_dates: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    next_repeat_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    repeat_end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    scheduled_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    published_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default='UTC')
    
    series_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('publication_series.id', ondelete='SET NULL'), nullable=True)
    series_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reply_to_post_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('publications.id', ondelete='SET NULL'), nullable=True)
    
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_ad: Mapped[bool] = mapped_column(Boolean, default=False, server_default=sa.text("false"), nullable=False, index=True)
    ad_buyer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ad_amount: Mapped[Optional[float]] = mapped_column(sa.Numeric(15, 2), nullable=True)
    ad_currency: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    ad_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    share_token: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, unique=True, index=True)
    share_token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    share_token_used: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index('ix_publications_owner_status_created', 'owner_id', 'status', 'created_at'),
        Index('ix_publications_owner_status_scheduled', 'owner_id', 'status', 'scheduled_time'),
        Index('ix_publications_owner_scheduled', 'owner_id', 'scheduled_time'),
        Index('ix_publications_owner_published', 'owner_id', 'published_time'),
        Index('ix_publications_owner_repeat', 'owner_id', 'repeat_interval', 'next_repeat_time'),
    )
    
    owner = relationship("User", back_populates="publications")
    channels = relationship('ChannelGroup', secondary=publication_channels, back_populates='publications')
    tags = relationship('Tag', secondary=publication_tags, back_populates='publications')
    series = relationship('PublicationSeries', back_populates='publications')
    notifications = relationship('PublicationNotification', back_populates='publication', cascade='all, delete-orphan')
    telegram_messages = relationship('TelegramMessage', back_populates='publication', cascade='all, delete-orphan')

    @property
    def auto_delete_delay_seconds(self):
        return self.auto_delete_seconds

    @auto_delete_delay_seconds.setter
    def auto_delete_delay_seconds(self, value):
        self.auto_delete_seconds = value


class PublicationSeries(Base):
    """Серия публикаций: набор постов с автоматической нумерацией и reply-цепочкой."""

    __tablename__ = 'publication_series'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reply_to_previous: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    publications = relationship('Publication', back_populates='series')




class Tag(Base):
    """Тег публикации; уникален по (owner_id, name)."""

    __tablename__ = 'tags'
    __table_args__ = (
        Index('ix_tags_owner_name', 'owner_id', 'name', unique=True),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship('User', back_populates='tags')
    publications = relationship('Publication', secondary=publication_tags, back_populates='tags')


class TelegramMessage(Base):
    """Связка Publication ↔ Channel ↔ telegram_message_id (одна на каждый канал отправки)."""

    __tablename__ = 'telegram_messages'
    __table_args__ = (
        Index('ix_telegram_messages_pub_channel', 'publication_id', 'channel_id'),
        Index('ix_telegram_messages_metrics_sync', 'metrics_synced_at'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    publication_id: Mapped[int] = mapped_column(Integer, ForeignKey('publications.id', ondelete='CASCADE'))
    channel_id: Mapped[int] = mapped_column(Integer, ForeignKey('channel_groups.id', ondelete='CASCADE'))
    telegram_message_id: Mapped[int] = mapped_column(Integer)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    views_count: Mapped[int] = mapped_column(Integer, default=0, server_default=sa.text("0"), nullable=False)
    forwards_count: Mapped[int] = mapped_column(Integer, default=0, server_default=sa.text("0"), nullable=False)
    reactions_count: Mapped[int] = mapped_column(Integer, default=0, server_default=sa.text("0"), nullable=False)
    comments_count: Mapped[int] = mapped_column(Integer, default=0, server_default=sa.text("0"), nullable=False)
    clicks_count: Mapped[int] = mapped_column(Integer, default=0, server_default=sa.text("0"), nullable=False)
    metrics_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    publication = relationship('Publication', back_populates='telegram_messages')
    channel = relationship('ChannelGroup', back_populates='telegram_messages')


class PublicationNotification(Base):
    """Уведомление о результате публикации (success / error) для UI."""

    __tablename__ = 'publication_notifications'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    publication_id: Mapped[int] = mapped_column(Integer, ForeignKey('publications.id', ondelete='CASCADE'))
    status: Mapped[str] = mapped_column(String(50))
    message: Mapped[str] = mapped_column(Text)
    error_details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    publication = relationship('Publication', back_populates='notifications')


class TextTemplate(Base):
    """Шаблон текста публикации для повторного использования."""

    __tablename__ = 'text_templates'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    formatted_content: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship("User", back_populates="text_templates")


class ButtonClick(Base):
    """Клик пользователя по inline-кнопке публикации; уникальный по (publication_id, button_id, tg_user_id)."""

    __tablename__ = 'button_clicks'
    __table_args__ = (
        Index('ix_button_clicks_pub_btn', 'publication_id', 'button_id'),
        Index('ix_button_clicks_pub_btn_user', 'publication_id', 'button_id', 'user_id', unique=True),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    publication_id: Mapped[int] = mapped_column(Integer, ForeignKey('publications.id', ondelete='CASCADE'), index=True)
    button_id: Mapped[str] = mapped_column(String(64))
    user_id: Mapped[int] = mapped_column(BigInteger)
    clicked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

