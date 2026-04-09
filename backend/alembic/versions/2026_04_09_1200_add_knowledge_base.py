"""add knowledge base tables

Revision ID: add_knowledge_base
Revises: add_repeat_excluded_dates
Create Date: 2026-04-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM


revision = "add_knowledge_base"
down_revision = "add_repeat_excluded_dates"
branch_labels = None
depends_on = None

locale_enum = ENUM("RU", "SR", "EN", name="locale", create_type=False)


def upgrade() -> None:
    op.create_table(
        "kb_categories",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("slug", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("locale", locale_enum, nullable=False, server_default="RU", index=True),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "kb_articles",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("kb_categories.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("slug", sa.String(255), nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("locale", locale_enum, nullable=False, server_default="RU", index=True),
        sa.Column("reading_minutes", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("sections", sa.JSON(), nullable=True),
        sa.Column("related_slugs", sa.JSON(), nullable=True),
        sa.Column("likes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("dislikes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("meta_title", sa.String(500), nullable=True),
        sa.Column("meta_description", sa.Text(), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("slug", "locale", name="uq_kb_articles_slug_locale"),
    )


def downgrade() -> None:
    op.drop_table("kb_articles")
    op.drop_table("kb_categories")
