"""add missing indexes for performance

Revision ID: 027_add_missing_indexes
Revises: 026_add_share_token_restrictions
Create Date: 2026-02-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '027_add_missing_indexes'
down_revision: Union[str, None] = '026_add_share_token_restrictions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- publication_tags: индексы на отдельные колонки + уникальный составной ---
    op.create_index('ix_publication_tags_publication_id', 'publication_tags', ['publication_id'])
    op.create_index('ix_publication_tags_tag_id', 'publication_tags', ['tag_id'])
    op.create_index('ix_publication_tags_pub_tag', 'publication_tags', ['publication_id', 'tag_id'], unique=True)

    # --- publication_channels: индексы на отдельные колонки + уникальный составной ---
    op.create_index('ix_publication_channels_publication_id', 'publication_channels', ['publication_id'])
    op.create_index('ix_publication_channels_channel_id', 'publication_channels', ['channel_id'])
    op.create_index('ix_publication_channels_pub_ch', 'publication_channels', ['publication_id', 'channel_id'], unique=True)

    # --- publications: составной индекс под главный query-паттерн ---
    op.create_index(
        'ix_publications_owner_status_created',
        'publications',
        ['owner_id', 'status', 'created_at'],
    )

    # --- telegram_messages: составной индекс для поиска по публикации+каналу ---
    op.create_index(
        'ix_telegram_messages_pub_channel',
        'telegram_messages',
        ['publication_id', 'channel_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_telegram_messages_pub_channel', table_name='telegram_messages')
    op.drop_index('ix_publications_owner_status_created', table_name='publications')

    op.drop_index('ix_publication_channels_pub_ch', table_name='publication_channels')
    op.drop_index('ix_publication_channels_channel_id', table_name='publication_channels')
    op.drop_index('ix_publication_channels_publication_id', table_name='publication_channels')

    op.drop_index('ix_publication_tags_pub_tag', table_name='publication_tags')
    op.drop_index('ix_publication_tags_tag_id', table_name='publication_tags')
    op.drop_index('ix_publication_tags_publication_id', table_name='publication_tags')
