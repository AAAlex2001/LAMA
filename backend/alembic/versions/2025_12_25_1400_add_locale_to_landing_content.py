"""add locale to landing content

Revision ID: 005_add_locale_landing
Revises: 004_add_trigger_chat_type
Create Date: 2025-12-25 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_add_locale_landing'
down_revision: Union[str, None] = '004_add_trigger_chat_type'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Создаем enum тип для локалей (если не существует)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE locale AS ENUM ('RU', 'SR', 'EN');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Добавляем колонку locale сначала как nullable
    op.add_column('landing_contents', 
                  sa.Column('locale', sa.Enum('RU', 'SR', 'EN', name='locale'), nullable=True))
    
    # Заполняем существующие записи значением по умолчанию с правильным CAST
    op.execute("UPDATE landing_contents SET locale = 'RU'::locale WHERE locale IS NULL")
    
    # Делаем колонку NOT NULL с default
    op.execute("ALTER TABLE landing_contents ALTER COLUMN locale SET DEFAULT 'RU'::locale")
    op.alter_column('landing_contents', 'locale', nullable=False)
    
    # Создаем индекс на колонку locale
    op.create_index(op.f('ix_landing_contents_locale'), 'landing_contents', ['locale'], unique=False)


def downgrade() -> None:
    # Удаляем индекс
    op.drop_index(op.f('ix_landing_contents_locale'), table_name='landing_contents')
    
    # Удаляем колонку
    op.drop_column('landing_contents', 'locale')
    
    # Удаляем enum тип
    op.execute("DROP TYPE IF EXISTS locale")
