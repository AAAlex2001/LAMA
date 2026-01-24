"""add repeat_end_time to publications

Revision ID: 023_add_repeat_end_time
Revises: 022_add_owner_id_to_tags
Create Date: 2026-01-24 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '023_add_repeat_end_time'
down_revision: Union[str, None] = '022_add_owner_id_to_tags'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('publications', sa.Column('repeat_end_time', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('publications', 'repeat_end_time')
