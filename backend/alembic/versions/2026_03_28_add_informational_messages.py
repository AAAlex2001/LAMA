"""add informational_messages table and info_messages_enabled flag

Revision ID: add_informational_messages
Revises: add_welcome_type
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa

revision = "add_informational_messages"
down_revision = "add_welcome_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "channel_groups",
        sa.Column("info_messages_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )

    op.create_table(
        "informational_messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("channel_id", sa.Integer(), sa.ForeignKey("channel_groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("text", sa.Text(), nullable=False, server_default=""),
        sa.Column("media_url", sa.Text(), nullable=True),
        sa.Column("media_type", sa.String(32), nullable=True),
        sa.Column("inline_keyboard", sa.JSON(), nullable=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("share_token", sa.String(64), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("informational_messages")
    op.drop_column("channel_groups", "info_messages_enabled")
