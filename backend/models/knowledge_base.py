from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base
from backend.models.landing import Locale


class KBCategory(Base):
    """Категория базы знаний: slug + title + локализация + порядок."""

    __tablename__ = "kb_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    locale: Mapped[Locale] = mapped_column(SQLEnum(Locale), nullable=False, default=Locale.RU, index=True)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    articles = relationship("KBArticle", back_populates="category", cascade="all, delete-orphan", order_by="KBArticle.order")


class KBArticle(Base):
    """Статья базы знаний: title + sections[] (JSON-блоки) + meta + feedback counters."""

    __tablename__ = "kb_articles"
    __table_args__ = (
        UniqueConstraint("slug", "locale", name="uq_kb_articles_slug_locale"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("kb_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    locale: Mapped[Locale] = mapped_column(SQLEnum(Locale), nullable=False, default=Locale.RU, index=True)
    reading_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    sections: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    related_slugs: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    likes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dislikes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    meta_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    meta_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    category = relationship("KBCategory", back_populates="articles")
