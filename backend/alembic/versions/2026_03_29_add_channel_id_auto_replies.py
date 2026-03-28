"""add channel_id to auto_replies and create auto_reply_logs

Revision ID: add_channel_id_auto_replies
Revises: add_auto_reply_frequency
Create Date: 2026-03-29
"""
from alembic import op
import sqlalchemy as sa

revision = "add_channel_id_auto_replies"
down_revision = "add_auto_reply_frequency"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bot_auto_replies",
        sa.Column("channel_id", sa.Integer(), sa.ForeignKey("channel_groups.id", ondelete="CASCADE"), nullable=True),
    )
    op.create_index("ix_bot_auto_replies_channel_id", "bot_auto_replies", ["channel_id"])

    op.create_table(
        "auto_reply_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("auto_reply_id", sa.Integer(), sa.ForeignKey("bot_auto_replies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("chat_id", sa.BigInteger(), nullable=False, index=True),
        sa.Column("user_id", sa.BigInteger(), nullable=True, index=True),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("auto_reply_logs")
    op.drop_index("ix_bot_auto_replies_channel_id", table_name="bot_auto_replies")
    op.drop_column("bot_auto_replies", "channel_id")
