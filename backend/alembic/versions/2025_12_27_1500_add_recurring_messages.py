"""add recurring messages

Revision ID: 006_add_recurring_messages
Revises: 005_add_locale_landing
Create Date: 2025-12-27 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '006_add_recurring_messages'
down_revision: Union[str, None] = '005_add_locale_landing'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Создаём enum только если не существует
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE recurringmessageinterval AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.create_table(
        'recurring_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bot_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('text_content', sa.Text(), nullable=True),
        sa.Column('media_url', sa.String(512), nullable=True),
        sa.Column('media_type', postgresql.ENUM('TEXT', 'PHOTO', 'VIDEO', 'DOCUMENT', 'AUDIO', 'VOICE', 'STICKER', 'ANIMATION', name='messagetype', create_type=False), nullable=True),
        sa.Column('inline_buttons', sa.JSON(), nullable=True),
        sa.Column('target_chats', sa.JSON(), nullable=False),
        sa.Column('interval_type', postgresql.ENUM('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM', name='recurringmessageinterval', create_type=False), nullable=False),
        sa.Column('interval_value', sa.Integer(), nullable=True),
        sa.Column('time_points', sa.JSON(), nullable=False),
        sa.Column('timezone', sa.String(50), nullable=False, server_default='UTC'),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('weekdays', sa.JSON(), nullable=True),
        sa.Column('last_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_send_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['bot_id'], ['bots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_recurring_messages_id', 'recurring_messages', ['id'])
    op.create_index('ix_recurring_messages_bot_id', 'recurring_messages', ['bot_id'])
    op.create_index('ix_recurring_messages_next_send_at', 'recurring_messages', ['next_send_at'])

    op.create_table(
        'recurring_message_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('recurring_message_id', sa.Integer(), nullable=False),
        sa.Column('chat_id', sa.BigInteger(), nullable=False),
        sa.Column('telegram_message_id', sa.Integer(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['recurring_message_id'], ['recurring_messages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_recurring_message_logs_id', 'recurring_message_logs', ['id'])
    op.create_index('ix_recurring_message_logs_recurring_message_id', 'recurring_message_logs', ['recurring_message_id'])
    op.create_index('ix_recurring_message_logs_sent_at', 'recurring_message_logs', ['sent_at'])


def downgrade() -> None:
    op.drop_index('ix_recurring_message_logs_sent_at', 'recurring_message_logs')
    op.drop_index('ix_recurring_message_logs_recurring_message_id', 'recurring_message_logs')
    op.drop_index('ix_recurring_message_logs_id', 'recurring_message_logs')
    op.drop_table('recurring_message_logs')

    op.drop_index('ix_recurring_messages_next_send_at', 'recurring_messages')
    op.drop_index('ix_recurring_messages_bot_id', 'recurring_messages')
    op.drop_index('ix_recurring_messages_id', 'recurring_messages')
    op.drop_table('recurring_messages')

    op.execute("DROP TYPE IF EXISTS recurringmessageinterval")
