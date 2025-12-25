"""add trigger chat type

Revision ID: 004_add_trigger_chat_type
Revises: 003_add_bot_login_codes
Create Date: 2025-12-25 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '004_add_trigger_chat_type'
down_revision = '003_add_bot_login_codes'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE triggerchattype AS ENUM ('PRIVATE', 'GROUP', 'BOTH');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.add_column('bot_triggers', sa.Column('chat_type', sa.Enum('PRIVATE', 'GROUP', 'BOTH', name='triggerchattype'), nullable=False, server_default='BOTH'))


def downgrade():
    op.drop_column('bot_triggers', 'chat_type')
    op.execute('DROP TYPE triggerchattype')
