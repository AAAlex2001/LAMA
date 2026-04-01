"""add approval_destination to bots

Revision ID: add_approval_destination
Revises: bot_command_button_clicks
Create Date: 2026-04-01
"""

from alembic import op
import sqlalchemy as sa


revision = "add_approval_destination"
down_revision = "bot_command_button_clicks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    approval_destination_enum = sa.Enum("INBOX", "TELEGRAM_BOT", name="approvaldestination")
    approval_destination_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "bots",
        sa.Column(
            "approval_destination",
            approval_destination_enum,
            nullable=False,
            server_default="INBOX",
        ),
    )


def downgrade() -> None:
    op.drop_column("bots", "approval_destination")
    sa.Enum(name="approvaldestination").drop(op.get_bind(), checkfirst=True)
