"""add backup job filter columns

Revision ID: 2026_03_22_job_filters
Revises: 2026_03_21_backup_settings
Create Date: 2026-03-22 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_03_22_job_filters'
down_revision = '2026_03_21_backup_settings'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('backup_jobs', sa.Column('content_types', sa.JSON(), nullable=True))
    op.add_column('backup_jobs', sa.Column('filter_start_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('backup_jobs', sa.Column('filter_end_date', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('backup_jobs', 'filter_end_date')
    op.drop_column('backup_jobs', 'filter_start_date')
    op.drop_column('backup_jobs', 'content_types')
