"""add is_system, protection_type, entry_method

Revision ID: 2026_03_09_batch3
Revises: 2026_03_09_reply_and_photo
Create Date: 2026-03-09 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2026_03_09_batch3'
down_revision: Union[str, None] = '2026_03_09_reply_and_photo'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('bot_messages', sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('chat_invite_links', sa.Column('protection_type', sa.String(32), nullable=True, server_default='none'))
    op.add_column('chat_invite_links', sa.Column('entry_method', sa.String(32), nullable=True, server_default='direct'))


def downgrade() -> None:
    op.drop_column('chat_invite_links', 'entry_method')
    op.drop_column('chat_invite_links', 'protection_type')
    op.drop_column('bot_messages', 'is_system')
