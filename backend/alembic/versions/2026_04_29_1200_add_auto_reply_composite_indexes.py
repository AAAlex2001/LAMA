"""add auto reply composite indexes

Revision ID: add_auto_reply_composite_indexes
Revises: add_system_eventtypes
Create Date: 2026-04-29 12:00:00.000000
"""

from alembic import op


revision = "add_auto_reply_composite_indexes"
down_revision = "add_system_eventtypes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_bot_auto_replies_bot_active_channel",
        "bot_auto_replies",
        ["bot_id", "is_active", "channel_id"],
    )
    op.create_index(
        "ix_auto_reply_logs_reply_chat_time",
        "auto_reply_logs",
        ["auto_reply_id", "chat_id", "triggered_at"],
    )
    op.create_index(
        "ix_auto_reply_logs_reply_user_time",
        "auto_reply_logs",
        ["auto_reply_id", "user_id", "triggered_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_auto_reply_logs_reply_user_time", table_name="auto_reply_logs")
    op.drop_index("ix_auto_reply_logs_reply_chat_time", table_name="auto_reply_logs")
    op.drop_index("ix_bot_auto_replies_bot_active_channel", table_name="bot_auto_replies")
