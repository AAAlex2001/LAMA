"""add UNBAN_USER to triggeractiontype enum

Revision ID: add_unban_trigger_action
Revises: add_knowledge_base
Create Date: 2026-04-21
"""

from alembic import op


revision = "add_unban_trigger_action"
down_revision = "add_knowledge_base"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE triggeractiontype ADD VALUE IF NOT EXISTS 'UNBAN_USER'")


def downgrade() -> None:
    pass