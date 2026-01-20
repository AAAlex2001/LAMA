"""add reply_to_post_id to publications

Revision ID: 021_add_reply_to_post_id
Revises: 020_add_owner_id_to_backup_jobs
Create Date: 2026-01-20 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '021_add_reply_to_post_id'
down_revision: Union[str, None] = '020_add_owner_id_to_backup_jobs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('publications', sa.Column('reply_to_post_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_publications_reply_to_post_id', 'publications', 'publications', ['reply_to_post_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_publications_reply_to_post_id', 'publications', type_='foreignkey')
    op.drop_column('publications', 'reply_to_post_id')
