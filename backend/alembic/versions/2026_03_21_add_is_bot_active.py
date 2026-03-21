"""add_is_bot_active_to_channel_groups

Revision ID: 2026_03_21_bot_active
Revises: 2026_03_17_repeat_idx
Create Date: 2026-03-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_03_21_bot_active'
down_revision = '2026_03_17_repeat_idx'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('channel_groups', sa.Column('is_bot_active', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    op.drop_column('channel_groups', 'is_bot_active')
