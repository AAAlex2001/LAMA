"""add color to tags

Revision ID: 010_add_color_to_tags
Revises: 009_add_repeat_interval
Create Date: 2025-01-12 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '010_add_color_to_tags'
down_revision: Union[str, None] = '009_add_repeat_interval'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add color column to tags table
    op.add_column('tags', sa.Column('color', sa.String(length=7), nullable=True))


def downgrade() -> None:
    # Remove color column from tags table
    op.drop_column('tags', 'color')
