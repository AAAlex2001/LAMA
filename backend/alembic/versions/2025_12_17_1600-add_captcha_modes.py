"""Add captcha modes and admin notification

Revision ID: 001_captcha_modes
Revises: 
Create Date: 2025-12-17 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_captcha_modes'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Добавляем новые поля для режимов капчи:
    - captcha_mode (DISABLED, JOIN_REQUEST, AFTER_JOIN, BOTH)
    - captcha_timeout_seconds (таймаут для капчи в группе)
    """
    # Создаём enum тип для captcha_mode если его нет
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE captchamode AS ENUM ('DISABLED', 'JOIN_REQUEST', 'AFTER_JOIN', 'BOTH');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Добавляем поля в таблицу bots
    op.add_column('bots', sa.Column('captcha_mode', sa.Enum('DISABLED', 'JOIN_REQUEST', 'AFTER_JOIN', 'BOTH', name='captchamode'), nullable=True))
    op.add_column('bots', sa.Column('captcha_timeout_seconds', sa.Integer(), nullable=True))
    
    # Устанавливаем значения по умолчанию для существующих записей
    op.execute("""
        UPDATE bots 
        SET captcha_mode = CASE 
            WHEN join_captcha_enabled = true THEN 'JOIN_REQUEST'::captchamode
            ELSE 'DISABLED'::captchamode
        END,
        captcha_timeout_seconds = 10
        WHERE captcha_mode IS NULL
    """)
    
    # Делаем поля NOT NULL после установки значений
    op.alter_column('bots', 'captcha_mode', nullable=False, server_default='DISABLED')
    op.alter_column('bots', 'captcha_timeout_seconds', nullable=False, server_default='10')


def downgrade() -> None:
    """
    Откатываем изменения
    """
    # Удаляем новые поля
    op.drop_column('bots', 'captcha_timeout_seconds')
    op.drop_column('bots', 'captcha_mode')
    
    # Удаляем enum тип (опционально, может быть использован в других таблицах)
    # op.execute("DROP TYPE IF EXISTS captchamode")

