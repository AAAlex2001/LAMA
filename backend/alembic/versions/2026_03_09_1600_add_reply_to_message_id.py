"""add reply_to_message_id and tg_photo_url

Revision ID: 2026_03_09_reply_and_photo
Revises: 2026_03_07_1915_add_direct_chats
Create Date: 2026-03-09 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2026_03_09_reply_and_photo'
down_revision: Union[str, None] = '2026_03_07_1915_add_direct_chats'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('bot_messages', sa.Column('reply_to_message_id', sa.Integer(), nullable=True))
    op.add_column('direct_chats', sa.Column('tg_photo_url', sa.String(512), nullable=True))


def downgrade() -> None:
    op.drop_column('direct_chats', 'tg_photo_url')
    op.drop_column('bot_messages', 'reply_to_message_id')
