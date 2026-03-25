"""add BAN to actiontype enum

Revision ID: 2026_03_26_ban
Revises: 2026_03_24_captcha
Create Date: 2026-03-26
"""

from alembic import op

revision = "2026_03_26_ban"
down_revision = "2026_03_24_captcha"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE actiontype ADD VALUE IF NOT EXISTS 'BAN'")


def downgrade() -> None:
    pass
