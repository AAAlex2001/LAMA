"""add forum_topics table

Revision ID: add_forum_topics
Revises: add_missing_indexes
Create Date: 2026-03-27
"""
from alembic import op
import sqlalchemy as sa

revision = "add_forum_topics"
down_revision = "add_missing_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "forum_topics",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("channel_id", sa.Integer(), sa.ForeignKey("channel_groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("thread_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("icon_color", sa.Integer(), nullable=True),
        sa.Column("icon_custom_emoji_id", sa.String(255), nullable=True),
        sa.Column("is_closed", sa.Boolean(), default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_forum_topics_channel_id", "forum_topics", ["channel_id"])
    op.create_index("ix_forum_topics_channel_thread", "forum_topics", ["channel_id", "thread_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_forum_topics_channel_thread", table_name="forum_topics")
    op.drop_index("ix_forum_topics_channel_id", table_name="forum_topics")
    op.drop_table("forum_topics")
