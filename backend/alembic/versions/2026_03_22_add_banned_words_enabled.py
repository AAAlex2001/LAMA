"""add banned_words_enabled and bot_messages index

Revision ID: 2026_03_22_banned_words
Revises: 2026_03_22_job_filters
Create Date: 2026-03-22
"""

from alembic import op
import sqlalchemy as sa

revision = "2026_03_22_banned_words"
down_revision = "2026_03_22_job_filters"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "channel_groups",
        sa.Column("banned_words_enabled", sa.Boolean(), server_default="false", nullable=False),
    )
    op.create_index(
        "ix_bot_messages_bot_chat_tg_msg",
        "bot_messages",
        ["bot_id", "chat_id", "telegram_message_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_bot_messages_bot_chat_tg_msg", table_name="bot_messages")
    op.drop_column("channel_groups", "banned_words_enabled")
