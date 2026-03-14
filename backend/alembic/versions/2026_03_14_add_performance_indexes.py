"""add_performance_indexes

Revision ID: 2026_03_14_perf_idx
Revises: 2026_03_13_add_calendar_indexes
Create Date: 2026-03-14 12:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '2026_03_14_perf_idx'
down_revision = '2026_03_13_add_calendar_indexes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Publications: calendar queries (owner_id + status + scheduled_time)
    op.create_index(
        'ix_publications_owner_status_scheduled',
        'publications',
        ['owner_id', 'status', 'scheduled_time'],
    )

    # InboxEvent: sorting and filtering
    op.create_index(
        'ix_inbox_events_owner_created',
        'inbox_events',
        ['owner_id', 'created_at'],
    )
    op.create_index(
        'ix_inbox_events_owner_status_created',
        'inbox_events',
        ['owner_id', 'status', 'created_at'],
    )

    # BotMessage: chat history and last message lookup
    op.create_index(
        'ix_bot_messages_bot_chat_created',
        'bot_messages',
        ['bot_id', 'chat_id', 'created_at'],
    )

    # DirectChat: sorting by updated_at per bot
    op.create_index(
        'ix_direct_chats_bot_updated',
        'direct_chats',
        ['bot_id', 'updated_at'],
    )


def downgrade() -> None:
    op.drop_index('ix_direct_chats_bot_updated', table_name='direct_chats')
    op.drop_index('ix_bot_messages_bot_chat_created', table_name='bot_messages')
    op.drop_index('ix_inbox_events_owner_status_created', table_name='inbox_events')
    op.drop_index('ix_inbox_events_owner_created', table_name='inbox_events')
    op.drop_index('ix_publications_owner_status_scheduled', table_name='publications')
