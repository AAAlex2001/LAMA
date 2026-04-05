"""add repeat_excluded_dates to publications

Revision ID: add_repeat_excluded_dates
Revises: add_approval_destination
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa


revision = "add_repeat_excluded_dates"
down_revision = "add_approval_destination"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("publications", sa.Column("repeat_excluded_dates", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("publications", "repeat_excluded_dates")
