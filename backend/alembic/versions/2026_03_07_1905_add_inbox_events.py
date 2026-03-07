"""add_inbox_events

Revision ID: 2026_03_07_1905_add_inbox_events
Revises: 
Create Date: 2026-03-07 19:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2026_03_07_1905_add_inbox_events'
down_revision = '028_add_button_clicks'

def upgrade() -> None:
    # Create Enums first
    inboxcategory = postgresql.ENUM('MODERATION', 'SYSTEM', 'AUTOMATION', name='inboxcategory')
    inboxcategory.create(op.get_bind())
    
    entitytype = postgresql.ENUM('BOT', 'CHANNEL', 'SYSTEM', name='entitytype')
    entitytype.create(op.get_bind())

    eventtype = postgresql.ENUM('BOT_MESSAGE', 'BOT_COMMAND', 'BOT_ERROR', 'CHANNEL_COMMENT', 'CHANNEL_JOIN_REQUEST', 'CHANNEL_LINK_JOIN', 'CHANNEL_BAN', 'SYSTEM_NOTIFICATION', 'SYSTEM_TRIGGER', 'SYSTEM_AUTOREPLY', 'SYSTEM_UPDATE', name='eventtype')
    eventtype.create(op.get_bind())
    
    eventstatus = postgresql.ENUM('NEW', 'PROCESSED', 'IGNORED', name='eventstatus')
    eventstatus.create(op.get_bind())

    op.create_table('inbox_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('category', postgresql.ENUM('MODERATION', 'SYSTEM', 'AUTOMATION', name='inboxcategory', create_type=False), nullable=False),
        sa.Column('entity_type', postgresql.ENUM('BOT', 'CHANNEL', 'SYSTEM', name='entitytype', create_type=False), nullable=False),
        sa.Column('event_type', postgresql.ENUM('BOT_MESSAGE', 'BOT_COMMAND', 'BOT_ERROR', 'CHANNEL_COMMENT', 'CHANNEL_JOIN_REQUEST', 'CHANNEL_LINK_JOIN', 'CHANNEL_BAN', 'SYSTEM_NOTIFICATION', 'SYSTEM_TRIGGER', 'SYSTEM_AUTOREPLY', 'SYSTEM_UPDATE', name='eventtype', create_type=False), nullable=False),
        sa.Column('bot_id', sa.Integer(), nullable=True),
        sa.Column('channel_id', sa.Integer(), nullable=True),
        sa.Column('tg_user_id', sa.BigInteger(), nullable=True),
        sa.Column('tg_username', sa.String(), nullable=True),
        sa.Column('status', postgresql.ENUM('NEW', 'PROCESSED', 'IGNORED', name='eventstatus', create_type=False), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        
        sa.ForeignKeyConstraint(['bot_id'], ['bots.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['channel_id'], ['channel_groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index(op.f('ix_inbox_events_category'), 'inbox_events', ['category'], unique=False)
    op.create_index(op.f('ix_inbox_events_created_at'), 'inbox_events', ['created_at'], unique=False)
    op.create_index(op.f('ix_inbox_events_id'), 'inbox_events', ['id'], unique=False)
    op.create_index(op.f('ix_inbox_events_owner_id'), 'inbox_events', ['owner_id'], unique=False)
    op.create_index(op.f('ix_inbox_events_status'), 'inbox_events', ['status'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_inbox_events_status'), table_name='inbox_events')
    op.drop_index(op.f('ix_inbox_events_owner_id'), table_name='inbox_events')
    op.drop_index(op.f('ix_inbox_events_id'), table_name='inbox_events')
    op.drop_index(op.f('ix_inbox_events_created_at'), table_name='inbox_events')
    op.drop_index(op.f('ix_inbox_events_category'), table_name='inbox_events')
    op.drop_table('inbox_events')
    
    postgresql.ENUM('NEW', 'PROCESSED', 'IGNORED', name='eventstatus').drop(op.get_bind())
    postgresql.ENUM('BOT_MESSAGE', 'BOT_COMMAND', 'BOT_ERROR', 'CHANNEL_COMMENT', 'CHANNEL_JOIN_REQUEST', 'CHANNEL_LINK_JOIN', 'CHANNEL_BAN', 'SYSTEM_NOTIFICATION', 'SYSTEM_TRIGGER', 'SYSTEM_AUTOREPLY', 'SYSTEM_UPDATE', name='eventtype').drop(op.get_bind())
    postgresql.ENUM('BOT', 'CHANNEL', 'SYSTEM', name='entitytype').drop(op.get_bind())
    postgresql.ENUM('MODERATION', 'SYSTEM', 'AUTOMATION', name='inboxcategory').drop(op.get_bind())

