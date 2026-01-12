"""add disable_notification to publications

Revision ID: 013_add_disable_notification
Revises: 012_add_last_used_at_to_tags
Create Date: 2026-01-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '013_add_disable_notification'
down_revision: Union[str, None] = '012_add_last_used_at_to_tags'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем колонку disable_notification с дефолтным значением False
    op.add_column('publications', sa.Column('disable_notification', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('publications', 'disable_notification')
