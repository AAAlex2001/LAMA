"""bot_command button clicks

Revision ID: bot_command_button_clicks
Revises: bot_commands_action_claim
Create Date: 2026-03-29
"""

from alembic import op
import sqlalchemy as sa


revision = "bot_command_button_clicks"
down_revision = "bot_commands_action_claim"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bot_command_button_clicks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("command_id", sa.Integer(), sa.ForeignKey("bot_commands.id", ondelete="CASCADE"), nullable=False),
        sa.Column("button_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("clicked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_bot_command_clicks_cmd_btn", "bot_command_button_clicks", ["command_id", "button_id"])
    op.create_index(
        "ix_bot_command_clicks_cmd_btn_user",
        "bot_command_button_clicks",
        ["command_id", "button_id", "user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_bot_command_clicks_cmd_btn_user", table_name="bot_command_button_clicks")
    op.drop_index("ix_bot_command_clicks_cmd_btn", table_name="bot_command_button_clicks")
    op.drop_table("bot_command_button_clicks")

