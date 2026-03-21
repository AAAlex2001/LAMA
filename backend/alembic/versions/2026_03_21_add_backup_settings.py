"""add backup settings columns

Revision ID: 2026_03_21_backup_settings
Revises: 2026_03_21_bot_active
Create Date: 2026-03-21 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_03_21_backup_settings'
down_revision = '2026_03_21_bot_active'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('channel_groups', sa.Column('backup_target_ids', sa.JSON(), nullable=True))
    op.add_column('channel_groups', sa.Column('backup_post_types', sa.JSON(), nullable=True))
    op.add_column('channel_groups', sa.Column('backup_content_types', sa.JSON(), nullable=True))
    op.add_column('channel_groups', sa.Column('backup_ai_prompt', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('channel_groups', 'backup_ai_prompt')
    op.drop_column('channel_groups', 'backup_content_types')
    op.drop_column('channel_groups', 'backup_post_types')
    op.drop_column('channel_groups', 'backup_target_ids')
