"""add welcome_type to bots

Revision ID: add_welcome_type
Revises: add_forum_topics
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa

revision = "add_welcome_type"
down_revision = "add_forum_topics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bots",
        sa.Column("welcome_type", sa.String(32), nullable=True),
    )
    op.execute("UPDATE bots SET welcome_type = 'group_message' WHERE welcome_type IS NULL")


def downgrade() -> None:
    op.drop_column("bots", "welcome_type")
