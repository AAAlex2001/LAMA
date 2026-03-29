"""add auto_reply_enabled to channel_groups

Revision ID: add_auto_reply_enabled
Revises: add_channel_id_auto_replies
Create Date: 2026-03-29
"""
from alembic import op
import sqlalchemy as sa

revision = "add_auto_reply_enabled"
down_revision = "add_channel_id_auto_replies"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "channel_groups",
        sa.Column("auto_reply_enabled", sa.Boolean(), nullable=False, server_default="true"),
    )


def downgrade() -> None:
    op.drop_column("channel_groups", "auto_reply_enabled")
