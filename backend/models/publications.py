from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Enum as SQLEnum, Table, func
from sqlalchemy.orm import relationship
from backend.models.base import Base
import enum


class PublicationStatus(enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    PARTIAL_SUCCESS = "partial_success"
    FAILED = "failed"
    DELETED = "deleted"


class ContentType(enum.Enum):
    TEXT = "text"
    TEXT_WITH_MEDIA = "text_with_media"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    LINK = "link"
    POLL = "poll"
    QUIZ = "quiz"


publication_tags = Table(
    'publication_tags',
    Base.metadata,
    Column('publication_id', Integer, ForeignKey('publications.id', ondelete='CASCADE')),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'))
)


publication_channels = Table(
    'publication_channels',
    Base.metadata,
    Column('publication_id', Integer, ForeignKey('publications.id', ondelete='CASCADE')),
    Column('channel_id', Integer, ForeignKey('channel_groups.id', ondelete='CASCADE'))
)


class Publication(Base):
    __tablename__ = 'publications'

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content_type = Column(SQLEnum(ContentType), nullable=False)
    status = Column(SQLEnum(PublicationStatus), default=PublicationStatus.DRAFT, nullable=False, index=True)
    
    text_content = Column(Text, nullable=True)
    formatted_content = Column(JSON, nullable=True)
    media_urls = Column(JSON, nullable=True)
    media_blur = Column(Boolean, default=False)
    
    inline_keyboard = Column(JSON, nullable=True)
    poll_data = Column(JSON, nullable=True)
    
    pin_message = Column(Boolean, default=False)
    auto_delete_hours = Column(Integer, nullable=True)
    
    scheduled_time = Column(DateTime(timezone=True), nullable=True, index=True)
    published_time = Column(DateTime(timezone=True), nullable=True)
    timezone = Column(String(50), default='UTC')
    
    series_id = Column(Integer, ForeignKey('publication_series.id', ondelete='SET NULL'), nullable=True)
    series_order = Column(Integer, nullable=True)
    
    ai_generated = Column(Boolean, default=False)
    ai_prompt = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    owner = relationship("User", back_populates="publications")
    channels = relationship('ChannelGroup', secondary=publication_channels, back_populates='publications')
    tags = relationship('Tag', secondary=publication_tags, back_populates='publications')
    series = relationship('PublicationSeries', back_populates='publications')
    notifications = relationship('PublicationNotification', back_populates='publication', cascade='all, delete-orphan')
    telegram_messages = relationship('TelegramMessage', back_populates='publication', cascade='all, delete-orphan')


class PublicationSeries(Base):
    __tablename__ = 'publication_series'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    publications = relationship('Publication', back_populates='series')




class Tag(Base):
    __tablename__ = 'tags'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    publications = relationship('Publication', secondary=publication_tags, back_populates='tags')


class TelegramMessage(Base):
    __tablename__ = 'telegram_messages'

    id = Column(Integer, primary_key=True, index=True)
    publication_id = Column(Integer, ForeignKey('publications.id', ondelete='CASCADE'), nullable=False)
    channel_id = Column(Integer, ForeignKey('channel_groups.id', ondelete='CASCADE'), nullable=False)
    telegram_message_id = Column(Integer, nullable=False)
    published_at = Column(DateTime(timezone=True), server_default=func.now())
    
    publication = relationship('Publication', back_populates='telegram_messages')
    channel = relationship('ChannelGroup', back_populates='telegram_messages')


class PublicationNotification(Base):
    __tablename__ = 'publication_notifications'

    id = Column(Integer, primary_key=True, index=True)
    publication_id = Column(Integer, ForeignKey('publications.id', ondelete='CASCADE'), nullable=False)
    status = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    error_details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    publication = relationship('Publication', back_populates='notifications')

