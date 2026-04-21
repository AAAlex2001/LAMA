"""add system EventType values

Revision ID: add_system_eventtypes
Revises: add_unban_trigger_action
Create Date: 2026-04-21 19:00:00.000000
"""

from alembic import op


revision = "add_system_eventtypes"
down_revision = "add_unban_trigger_action"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE eventtype ADD VALUE IF NOT EXISTS 'CHANNEL_MEMBER_JOINED'")
    op.execute("ALTER TYPE eventtype ADD VALUE IF NOT EXISTS 'CHANNEL_MEMBER_LEFT'")
    op.execute("ALTER TYPE eventtype ADD VALUE IF NOT EXISTS 'CHANNEL_TITLE_CHANGED'")
    op.execute("ALTER TYPE eventtype ADD VALUE IF NOT EXISTS 'CHANNEL_PHOTO_CHANGED'")
    op.execute("ALTER TYPE eventtype ADD VALUE IF NOT EXISTS 'CHANNEL_PINNED_MESSAGE'")


def downgrade() -> None:
    pass
