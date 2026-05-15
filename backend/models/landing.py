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
    """Тип одной записи в LandingContent: TEXT (заголовок/текст), IMAGE (картинка), LINK (URL+title)."""

    TEXT = "text"  # Текстовое поле (заголовок/абзац/кнопка)
    IMAGE = "image"  # Изображение (url + alt)
    LINK = "link"  # Ссылка (text + url)


class SectionType(str, enum.Enum):
    """Тип секции лендинга — соответствует блоку на странице (HERO, FAQ, PRICING и т.д.)."""
    HERO = "hero"  # Первый экран лендинга
    ADVANTAGES = "advantages"  # Преимущества (карточки)
    KEY_ADVANTAGES = "key_advantages"  # Иконные преимущества
    FAQ = "faq"  # Вопросы/ответы
    PRICING = "pricing"  # Тарифы
    USERS = "users"  # Блок со счётчиком пользователей
    LAMA = "lama"  # Блок про канал/автора
    FOOTER = "footer"  # Подвал
    HEADER = "header"  # Шапка
    OTHER = "other"  # Прочее


class Locale(str, enum.Enum):
    """Поддерживаемые локали контента: RU, SR (сербский), EN."""
    RU = "RU"  # Русский
    SR = "SR"  # Сербский
    EN = "EN"  # Английский


class LandingSection(Base):
    """Одна секция лендинга (Hero, FAQ, ...). Контент с локализацией хранится в LandingContent."""
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
    """Одно поле секции (key/value), локализованное. Для коллекций ключи нумерованные (hero_image_landing_1)."""
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


class Template(Base):
    """Шаблоны страниц (отдельная сущность, не зависит от Advantages)"""
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    contents = relationship("TemplateContent", back_populates="template", cascade="all, delete-orphan")


class TemplateContent(Base):
    """Контент шаблонов (тексты, блоки, FAQ и т.д.) с поддержкой локализации"""
    __tablename__ = "template_contents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False, index=True)
    locale: Mapped[Locale] = mapped_column(SQLEnum(Locale), nullable=False, default=Locale.RU, index=True)
    
    headline: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    lead: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    cta_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cta_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    images: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    blocks: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    faq: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    cards_block: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    subscribe_blocks: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    template = relationship("Template", back_populates="contents")
