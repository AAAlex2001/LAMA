"""add_calendar_indexes

Revision ID: 2026_03_13_add_calendar_indexes
Revises: 2026_03_11_eve_banned
Create Date: 2026-03-13 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_03_13_add_calendar_indexes'
down_revision = '2026_03_11_eve_banned'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add composite indexes to speed up calendar ordering
    op.create_index('ix_publications_owner_scheduled', 'publications', ['owner_id', 'scheduled_time'])
    op.create_index('ix_publications_owner_published', 'publications', ['owner_id', 'published_time'])


def downgrade() -> None:
    op.drop_index('ix_publications_owner_published', table_name='publications')
    op.drop_index('ix_publications_owner_scheduled', table_name='publications')
