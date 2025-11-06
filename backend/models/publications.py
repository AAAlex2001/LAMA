from __future__ import annotations
import enum
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Table,
    Text,
    create_engine,
    select,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/telegram_publisher")


class Base(DeclarativeBase):
    pass


class PublicationStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    published = "published"
    failed = "failed"
    deleted = "deleted"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    done = "done"
    failed = "failed"


class TaskAction(str, enum.Enum):
    publish = "publish"
    delete = "delete"
    pin = "pin"
    unpin = "unpin"


class Channel(Base):
    __tablename__ = "channels"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tg_chat_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    timezone: Mapped[str] = mapped_column(String(64), default=os.getenv("TZ_DEFAULT", "Europe/Riga"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    targets: Mapped[List["PublicationTarget"]] = relationship(back_populates="channel", cascade="all, delete-orphan")


class Series(Base):
    __tablename__ = "series"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    publications: Mapped[List["Publication"]] = relationship(back_populates="series")


class Publication(Base):
    __tablename__ = "publications"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), default="")
    content: Mapped[dict] = mapped_column(JSON)  # список "частей" контента: текст/медиа/ссылки/опросы/кнопки/оформление
    parse_mode: Mapped[str] = mapped_column(String(16), default="HTML")  # HTML|MarkdownV2
    status: Mapped[PublicationStatus] = mapped_column(Enum(PublicationStatus), default=PublicationStatus.draft)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    tz: Mapped[str] = mapped_column(String(64), default=os.getenv("TZ_DEFAULT", "Europe/Riga"))
    auto_pin: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_delete_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    preview_only: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    series_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("series.id"), nullable=True)
    series: Mapped[Optional[Series]] = relationship(back_populates="publications")

    targets: Mapped[List["PublicationTarget"]] = relationship(back_populates="publication", cascade="all, delete-orphan")
    tags: Mapped[List["Tag"]] = relationship(secondary="publication_tags", back_populates="publications")


class PublicationTarget(Base):
    __tablename__ = "publication_targets"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    publication_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publications.id", ondelete="CASCADE"))
    channel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"))

    status: Mapped[PublicationStatus] = mapped_column(Enum(PublicationStatus), default=PublicationStatus.scheduled)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))  # если отличается от публикации
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    message_ids: Mapped[Optional[List[int]]] = mapped_column(ARRAY(BigInteger), nullable=True)  # один пост может стать группой сообщений
    pin_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    publication: Mapped[Publication] = relationship(back_populates="targets")
    channel: Mapped[Channel] = relationship(back_populates="targets")


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    publications: Mapped[List[Publication]] = relationship(secondary="publication_tags", back_populates="tags")


class PublicationTag(Base):
    __tablename__ = "publication_tags"
    publication_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publications.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class ScheduledTask(Base):
    __tablename__ = "scheduled_tasks"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action: Mapped[TaskAction] = mapped_column(Enum(TaskAction))
    publication_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("publications.id", ondelete="CASCADE"), nullable=True)
    target_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("publication_targets.id", ondelete="CASCADE"), nullable=True)
    channel_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"), nullable=True)
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.pending)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


engine = create_async_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncSession:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
