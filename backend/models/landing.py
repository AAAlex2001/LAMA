"""
Модели для контента лендинга
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
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
    FAQ = "faq"
    PRICING = "pricing"
    FOOTER = "footer"
    HEADER = "header"
    OTHER = "other"


class LandingSection(Base):
    """Секция лендинга"""
    __tablename__ = "landing_sections"

    id = Column(Integer, primary_key=True, index=True)
    section_type = Column(SQLEnum(SectionType), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    contents = relationship("LandingContent", back_populates="section", cascade="all, delete-orphan", order_by="LandingContent.order")


class LandingContent(Base):
    """Контент лендинга (тексты, изображения, ссылки и т.д.)"""
    __tablename__ = "landing_contents"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("landing_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    content_type = Column(SQLEnum(ContentType), nullable=False, index=True)
    
    # Основные поля
    key = Column(String(255), nullable=False, index=True)
    title = Column(String(500), nullable=True)
    text = Column(Text, nullable=True)
    subtitle = Column(Text, nullable=True)
    
    # Медиа
    image_url = Column(String(512), nullable=True)
    image_alt = Column(String(255), nullable=True)
    
    # Ссылки и кнопки
    link_url = Column(String(512), nullable=True)
    link_text = Column(String(255), nullable=True)
    
    # Настройки отображения
    is_active = Column(Boolean, default=True, nullable=False)
    order = Column(Integer, default=0, nullable=False)
    
    # Метаданные
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    section = relationship("LandingSection", back_populates="contents")

