"""Add text templates table

Revision ID: 017_add_text_templates
Revises: 016_add_media_file_ids
Create Date: 2026-01-14 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '017_add_text_templates'
down_revision: Union[str, None] = '016_add_media_file_ids'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'text_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('formatted_content', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_text_templates_owner_id'), 'text_templates', ['owner_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_text_templates_owner_id'), table_name='text_templates')
    op.drop_table('text_templates')
