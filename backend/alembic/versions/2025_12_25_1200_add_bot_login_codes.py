"""add bot login codes

Revision ID: 2025_12_25_1200
Revises: 2025_12_24_1045
Create Date: 2025-12-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '003_add_bot_login_codes'
down_revision = '002_remove_token_unique'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'bot_login_codes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=32), nullable=False),
        sa.Column('telegram_id', sa.BigInteger(), nullable=False),
        sa.Column('username', sa.String(length=255), nullable=True),
        sa.Column('first_name', sa.String(length=255), nullable=True),
        sa.Column('last_name', sa.String(length=255), nullable=True),
        sa.Column('photo_url', sa.String(length=512), nullable=True),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bot_login_codes_code'), 'bot_login_codes', ['code'], unique=True)
    op.create_index(op.f('ix_bot_login_codes_telegram_id'), 'bot_login_codes', ['telegram_id'], unique=False)
    op.create_index(op.f('ix_bot_login_codes_is_used'), 'bot_login_codes', ['is_used'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_bot_login_codes_is_used'), table_name='bot_login_codes')
    op.drop_index(op.f('ix_bot_login_codes_telegram_id'), table_name='bot_login_codes')
    op.drop_index(op.f('ix_bot_login_codes_code'), table_name='bot_login_codes')
    op.drop_table('bot_login_codes')
