"""
Модели для контента лендинга
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from backend.models.base import Base


class ContentType(str, enum.Enum):
    """Тип контента"""
    TEXT = "text"
    IMAGE = "image"
    LINK = "link"


class SectionType(str, enum.Enum):
    """Тип секции лендинга"""
    HERO = "hero"
    ADVANTAGES = "advantages"
    KEY_ADVANTAGES = "key_advantages"
    FAQ = "faq"
    PRICING = "pricing"
    USERS = "users"
    LAMA = "lama"
    FOOTER = "footer"
    HEADER = "header"
    OTHER = "other"


class Locale(str, enum.Enum):
    """Поддерживаемые локали"""
    RU = "RU"
    SR = "SR"
    EN = "EN"


class LandingSection(Base):
    """Секция лендинга"""
    __tablename__ = "landing_sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    section_type: Mapped[SectionType] = mapped_column(SQLEnum(SectionType), nullable=False, unique=True, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    contents = relationship("LandingContent", back_populates="section", cascade="all, delete-orphan", order_by="LandingContent.order")


class LandingContent(Base):
    """Контент лендинга (тексты, изображения, ссылки и т.д.)"""
    __tablename__ = "landing_contents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    section_id: Mapped[int] = mapped_column(Integer, ForeignKey("landing_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    content_type: Mapped[ContentType] = mapped_column(SQLEnum(ContentType), nullable=False, index=True)
    locale: Mapped[Locale] = mapped_column(SQLEnum(Locale), nullable=False, default=Locale.RU, index=True)
    
    # Основные поля
    key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subtitle: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Медиа
    image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    image_alt: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Ссылки и кнопки
    link_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    link_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Дополнительные данные (JSON)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    
    # Настройки отображения
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Метаданные
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    section = relationship("LandingSection", back_populates="contents")

