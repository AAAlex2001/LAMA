"""informational_messages.media_urls + bot_commands.channel_id

Revision ID: info_msg_media_urls
Revises: add_auto_reply_enabled
Create Date: 2026-03-29

"""
from alembic import op
import sqlalchemy as sa


revision = "info_msg_media_urls"
down_revision = "add_auto_reply_enabled"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "informational_messages",
        sa.Column("media_urls", sa.JSON(), nullable=True),
    )
    op.add_column(
        "bot_commands",
        sa.Column(
            "channel_id",
            sa.Integer(),
            sa.ForeignKey("channel_groups.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index("ix_bot_commands_channel_id", "bot_commands", ["channel_id"])
    op.create_index(
        "ix_bot_commands_bot_channel_cmd",
        "bot_commands",
        ["bot_id", "channel_id", "command"],
        unique=True,
        postgresql_where=sa.text("channel_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_bot_commands_bot_channel_cmd", table_name="bot_commands")
    op.drop_index("ix_bot_commands_channel_id", table_name="bot_commands")
    op.drop_column("bot_commands", "channel_id")
    op.drop_column("informational_messages", "media_urls")
