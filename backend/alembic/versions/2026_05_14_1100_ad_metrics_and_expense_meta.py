"""ad metrics on telegram_messages + ad meta on publications + expense fields on ad_revenues

Revision ID: ad_metrics_meta
Revises: pub_is_ad
Create Date: 2026-05-14 11:00:00.000000
"""

import sqlalchemy as sa
from alembic import op


revision = "ad_metrics_meta"
down_revision = "pub_is_ad"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── metrics on telegram_messages ───────────────────────────────────
    op.add_column("telegram_messages", sa.Column("views_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("telegram_messages", sa.Column("forwards_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("telegram_messages", sa.Column("reactions_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("telegram_messages", sa.Column("comments_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("telegram_messages", sa.Column("clicks_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("telegram_messages", sa.Column("metrics_synced_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_telegram_messages_metrics_sync", "telegram_messages", ["metrics_synced_at"])

    # ── ad meta on publications (для сохранения формы рекламы в черновике) ─
    op.add_column("publications", sa.Column("ad_buyer", sa.String(length=255), nullable=True))
    op.add_column("publications", sa.Column("ad_amount", sa.Numeric(15, 2), nullable=True))
    op.add_column("publications", sa.Column("ad_currency", sa.String(length=8), nullable=True))
    op.add_column("publications", sa.Column("ad_note", sa.Text(), nullable=True))

    # ── extra fields on ad_revenues (для модалки расхода) ──────────────
    op.add_column("ad_revenues", sa.Column("channel_username", sa.String(length=255), nullable=True))
    op.add_column("ad_revenues", sa.Column("post_link", sa.String(length=512), nullable=True))
    op.add_column("ad_revenues", sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("ad_revenues", sa.Column("is_auto_delete", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("ad_revenues", sa.Column("is_repeating", sa.Boolean(), nullable=False, server_default=sa.text("false")))


def downgrade() -> None:
    op.drop_column("ad_revenues", "is_repeating")
    op.drop_column("ad_revenues", "is_auto_delete")
    op.drop_column("ad_revenues", "is_pinned")
    op.drop_column("ad_revenues", "post_link")
    op.drop_column("ad_revenues", "channel_username")

    op.drop_column("publications", "ad_note")
    op.drop_column("publications", "ad_currency")
    op.drop_column("publications", "ad_amount")
    op.drop_column("publications", "ad_buyer")

    op.drop_index("ix_telegram_messages_metrics_sync", table_name="telegram_messages")
    op.drop_column("telegram_messages", "metrics_synced_at")
    op.drop_column("telegram_messages", "clicks_count")
    op.drop_column("telegram_messages", "comments_count")
    op.drop_column("telegram_messages", "reactions_count")
    op.drop_column("telegram_messages", "forwards_count")
    op.drop_column("telegram_messages", "views_count")
