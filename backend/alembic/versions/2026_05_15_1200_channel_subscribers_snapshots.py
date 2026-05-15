"""channel_subscribers_snapshots: hourly subscribers snapshot per channel

Revision ID: channel_subs_snap
Revises: ad_metrics_meta
Create Date: 2026-05-15 12:00:00.000000
"""

import sqlalchemy as sa
from alembic import op


revision = "channel_subs_snap"
down_revision = "ad_metrics_meta"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "channel_subscribers_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "channel_id",
            sa.Integer(),
            sa.ForeignKey("channel_groups.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("subscribers_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_channel_subs_snap_channel_taken",
        "channel_subscribers_snapshots",
        ["channel_id", "taken_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_channel_subs_snap_channel_taken",
        table_name="channel_subscribers_snapshots",
    )
    op.drop_table("channel_subscribers_snapshots")
