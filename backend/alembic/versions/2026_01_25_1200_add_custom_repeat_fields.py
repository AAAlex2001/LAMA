"""add custom repeat fields

Revision ID: 024_add_custom_repeat_fields
Revises: 023_add_repeat_end_time
Create Date: 2026-01-25 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '024_add_custom_repeat_fields'
down_revision: Union[str, None] = '023_add_repeat_end_time'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('publications', sa.Column('repeat_custom_unit', sa.String(length=10), nullable=True))
    op.add_column('publications', sa.Column('repeat_custom_value', sa.Integer(), nullable=True))
    op.add_column('publications', sa.Column('repeat_weekdays', sa.JSON(), nullable=True))
    op.add_column('publications', sa.Column('repeat_month_days', sa.JSON(), nullable=True))
    op.add_column('publications', sa.Column('repeat_year_month', sa.Integer(), nullable=True))
    op.add_column('publications', sa.Column('repeat_year_days', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('publications', 'repeat_year_days')
    op.drop_column('publications', 'repeat_year_month')
    op.drop_column('publications', 'repeat_month_days')
    op.drop_column('publications', 'repeat_weekdays')
    op.drop_column('publications', 'repeat_custom_value')
    op.drop_column('publications', 'repeat_custom_unit')
