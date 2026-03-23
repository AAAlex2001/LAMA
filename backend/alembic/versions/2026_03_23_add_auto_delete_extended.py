"""add extended auto-delete fields

Revision ID: 2026_03_23_auto_delete_ext
Revises: 2026_03_23_moderation
Create Date: 2026-03-23
"""

from alembic import op
import sqlalchemy as sa

revision = "2026_03_23_auto_delete_ext"
down_revision = "2026_03_23_moderation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("channel_auto_delete_settings", sa.Column("delete_join_messages", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("channel_auto_delete_settings", sa.Column("delete_all_messages", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("channel_auto_delete_settings", sa.Column("delete_text_only", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("channel_auto_delete_settings", sa.Column("delete_media_only", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("channel_auto_delete_settings", sa.Column("delete_delay_seconds", sa.Integer(), server_default="0", nullable=False))


def downgrade() -> None:
    op.drop_column("channel_auto_delete_settings", "delete_delay_seconds")
    op.drop_column("channel_auto_delete_settings", "delete_media_only")
    op.drop_column("channel_auto_delete_settings", "delete_text_only")
    op.drop_column("channel_auto_delete_settings", "delete_all_messages")
    op.drop_column("channel_auto_delete_settings", "delete_join_messages")
