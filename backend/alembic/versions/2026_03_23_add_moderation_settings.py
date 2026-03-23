"""add commands_enabled, enabled_commands, block_media_types to channel_groups

Revision ID: 2026_03_23_moderation
Revises: 2026_03_22_last_msg
Create Date: 2026-03-23
"""

from alembic import op
import sqlalchemy as sa

revision = "2026_03_23_moderation"
down_revision = "2026_03_22_last_msg"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "channel_groups",
        sa.Column("commands_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "channel_groups",
        sa.Column("enabled_commands", sa.JSON(), nullable=True),
    )
    op.add_column(
        "channel_groups",
        sa.Column("block_media_types", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("channel_groups", "block_media_types")
    op.drop_column("channel_groups", "enabled_commands")
    op.drop_column("channel_groups", "commands_enabled")
