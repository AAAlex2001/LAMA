"""add direct chats

Revision ID: 2026_03_07_1915_add_direct_chats
Revises: 2026_03_07_1905_add_inbox_events
Create Date: 2026-03-07 19:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_03_07_1915_add_direct_chats'
down_revision: Union[str, None] = '2026_03_07_1905_add_inbox_events'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('direct_chats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bot_id', sa.Integer(), nullable=False),
        sa.Column('tg_chat_id', sa.BigInteger(), nullable=False),
        sa.Column('tg_user_id', sa.BigInteger(), nullable=True),
        sa.Column('tg_username', sa.String(), nullable=True),
        sa.Column('tg_first_name', sa.String(), nullable=True),
        sa.Column('tg_last_name', sa.String(), nullable=True),
        sa.Column('unread_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_blocked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['bot_id'], ['bots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_direct_chats_id'), 'direct_chats', ['id'], unique=False)
    op.create_index(op.f('ix_direct_chats_bot_id'), 'direct_chats', ['bot_id'], unique=False)
    op.create_index(op.f('ix_direct_chats_tg_chat_id'), 'direct_chats', ['tg_chat_id'], unique=False)
    op.create_index('ix_direct_chats_bot_chat', 'direct_chats', ['bot_id', 'tg_chat_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_direct_chats_bot_chat', table_name='direct_chats')
    op.drop_index(op.f('ix_direct_chats_tg_chat_id'), table_name='direct_chats')
    op.drop_index(op.f('ix_direct_chats_bot_id'), table_name='direct_chats')
    op.drop_index(op.f('ix_direct_chats_id'), table_name='direct_chats')
    op.drop_table('direct_chats')
