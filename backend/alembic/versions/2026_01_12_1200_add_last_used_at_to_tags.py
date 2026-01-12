"""add last_used_at to tags

Revision ID: 012_add_last_used_at_to_tags
Revises: 011_add_repeat_custom_hours
Create Date: 2026-01-12 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '012_add_last_used_at_to_tags'
down_revision: Union[str, None] = '011_add_repeat_custom_hours'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем колонку last_used_at с дефолтным значением текущего времени
    op.add_column('tags', sa.Column('last_used_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
    
    # Устанавливаем для существующих записей значение created_at
    op.execute("UPDATE tags SET last_used_at = created_at WHERE last_used_at IS NULL")


def downgrade() -> None:
    op.drop_column('tags', 'last_used_at')
