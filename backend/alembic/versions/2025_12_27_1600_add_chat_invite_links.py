"""add chat invite links

Revision ID: 007_add_chat_invite_links
Revises: 006_add_recurring_messages
Create Date: 2025-12-27 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '007_add_chat_invite_links'
down_revision: Union[str, None] = '006_add_recurring_messages'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'chat_invite_links',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('channel_id', sa.Integer(), nullable=False),
        sa.Column('invite_link', sa.String(500), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('creator_id', sa.BigInteger(), nullable=True),
        sa.Column('creates_join_request', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('expire_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('member_limit', sa.Integer(), nullable=True),
        sa.Column('pending_join_request_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('member_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('subscription_period', sa.Integer(), nullable=True),
        sa.Column('subscription_price', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['channel_id'], ['channel_groups.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('invite_link')
    )
    op.create_index(op.f('ix_chat_invite_links_id'), 'chat_invite_links', ['id'], unique=False)
    op.create_index(op.f('ix_chat_invite_links_channel_id'), 'chat_invite_links', ['channel_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_chat_invite_links_channel_id'), table_name='chat_invite_links')
    op.drop_index(op.f('ix_chat_invite_links_id'), table_name='chat_invite_links')
    op.drop_table('chat_invite_links')
