"""add response_media_urls, update eventstatus enum

Revision ID: 2026_03_10_batch4
Revises: 2026_03_09_batch3
Create Date: 2026-03-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2026_03_10_batch4'
down_revision: Union[str, None] = '2026_03_09_batch3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # response_media_urls для команд и автоответов
    op.add_column('bot_commands', sa.Column('response_media_urls', sa.JSON(), nullable=True))
    op.add_column('bot_auto_replies', sa.Column('response_media_urls', sa.JSON(), nullable=True))

    # Новый статус BANNED в enum eventstatus
    op.execute("ALTER TYPE eventstatus ADD VALUE IF NOT EXISTS 'banned'")


def downgrade() -> None:
    op.drop_column('bot_auto_replies', 'response_media_urls')
    op.drop_column('bot_commands', 'response_media_urls')
    # PostgreSQL не поддерживает удаление значений из enum,
    # downgrade для eventstatus пропущен.
