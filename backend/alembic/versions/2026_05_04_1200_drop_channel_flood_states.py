"""drop channel_flood_states (moved to Redis)

Revision ID: drop_channel_flood_states
Revises: add_auto_reply_composite_indexes
Create Date: 2026-05-04 12:00:00.000000
"""

import sqlalchemy as sa
from alembic import op


revision = "drop_channel_flood_states"
down_revision = "add_auto_reply_composite_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_channel_flood_states_channel_user", table_name="channel_flood_states")
    op.drop_table("channel_flood_states")


def downgrade() -> None:
    op.create_table(
        "channel_flood_states",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("channel_id", sa.Integer(), sa.ForeignKey("channel_groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index(
        "ix_channel_flood_states_channel_user",
        "channel_flood_states",
        ["channel_id", "user_id"],
        unique=True,
    )
