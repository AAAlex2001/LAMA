"""add_repeat_index

Revision ID: 2026_03_17_repeat_idx
Revises: 2026_03_14_perf_idx
Create Date: 2026-03-17 12:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '2026_03_17_repeat_idx'
down_revision = '2026_03_14_perf_idx'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        'ix_publications_owner_repeat',
        'publications',
        ['owner_id', 'repeat_interval', 'next_repeat_time'],
    )


def downgrade() -> None:
    op.drop_index('ix_publications_owner_repeat', table_name='publications')
