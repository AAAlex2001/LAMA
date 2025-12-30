"""Add email and password to users

Revision ID: 008_add_email_password
Revises: 007_add_chat_invite_links
Create Date: 2025-12-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008_add_email_password'
down_revision: Union[str, None] = '007_add_chat_invite_links'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поля email и password_hash в таблицу users
    op.add_column('users', sa.Column('email', sa.String(255), nullable=True, unique=True, index=True))
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('agree_personal_data', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('agree_terms', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('users', 'agree_terms')
    op.drop_column('users', 'agree_personal_data')
    op.drop_column('users', 'email_verified')
    op.drop_column('users', 'password_hash')
    op.drop_column('users', 'email')
