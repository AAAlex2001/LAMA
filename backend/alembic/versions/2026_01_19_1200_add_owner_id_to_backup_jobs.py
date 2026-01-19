"""add owner_id to backup_jobs

Revision ID: 020_add_owner_id_to_backup_jobs
Revises: 019_add_disable_web_page_preview
Create Date: 2026-01-19 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '020_add_owner_id_to_backup_jobs'
down_revision: Union[str, None] = '019_add_disable_web_page_preview'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('backup_jobs', sa.Column('owner_id', sa.Integer(), nullable=False))
    op.create_foreign_key('fk_backup_jobs_owner_id', 'backup_jobs', 'users', ['owner_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    op.drop_constraint('fk_backup_jobs_owner_id', 'backup_jobs', type_='foreignkey')
    op.drop_column('backup_jobs', 'owner_id')
