"""bot_commands.action_type + claim target

Revision ID: bot_commands_action_claim
Revises: info_msg_media_urls
Create Date: 2026-03-29
"""

from alembic import op
import sqlalchemy as sa


revision = "bot_commands_action_claim"
down_revision = "info_msg_media_urls"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bot_commands",
        sa.Column(
            "action_type",
            sa.String(length=32),
            nullable=False,
            server_default="MESSAGE",
        ),
    )
    op.add_column("bot_commands", sa.Column("claim_target", sa.String(length=32), nullable=True))
    op.add_column("bot_commands", sa.Column("claim_channel_ids", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("bot_commands", "claim_channel_ids")
    op.drop_column("bot_commands", "claim_target")
    op.drop_column("bot_commands", "action_type")

