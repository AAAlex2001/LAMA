"""add share_token to publications

Revision ID: 025_add_share_token
Revises: 024_add_custom_repeat_fields
Create Date: 2026-02-12 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '025_add_share_token'
down_revision = '024_add_custom_repeat_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('publications', sa.Column('share_token', sa.String(64), nullable=True))
    op.create_index('ix_publications_share_token', 'publications', ['share_token'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_publications_share_token', table_name='publications')
    op.drop_column('publications', 'share_token')
