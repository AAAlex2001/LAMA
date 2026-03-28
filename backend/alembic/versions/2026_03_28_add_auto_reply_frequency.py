"""add frequency_limit fields to bot_auto_replies

Revision ID: add_auto_reply_frequency
Revises: add_informational_messages
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa

revision = "add_auto_reply_frequency"
down_revision = "add_informational_messages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bot_auto_replies",
        sa.Column("frequency_limit_minutes", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bot_auto_replies",
        sa.Column("frequency_limit_type", sa.String(16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("bot_auto_replies", "frequency_limit_type")
    op.drop_column("bot_auto_replies", "frequency_limit_minutes")
