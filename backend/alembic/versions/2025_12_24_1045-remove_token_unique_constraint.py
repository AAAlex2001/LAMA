"""Remove unique constraint from bots.token

Revision ID: 002_remove_token_unique
Revises: 001_captcha_modes
Create Date: 2025-12-24 10:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_remove_token_unique'
down_revision: Union[str, None] = '001_captcha_modes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Удаляем уникальный constraint на bots.token и bots.telegram_id,
    чтобы один бот мог быть зарегистрирован несколькими пользователями.
    Вместо этого уникальность будет на паре (owner_id, telegram_id).
    """
    # Удаляем unique constraint на token (если существует)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE bots DROP CONSTRAINT IF EXISTS bots_token_key;
        EXCEPTION
            WHEN undefined_object THEN NULL;
        END $$;
    """)
    
    # Удаляем unique constraint на telegram_id (если существует)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE bots DROP CONSTRAINT IF EXISTS bots_telegram_id_key;
        EXCEPTION
            WHEN undefined_object THEN NULL;
        END $$;
    """)
    
    # Удаляем unique constraint на username (если существует)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE bots DROP CONSTRAINT IF EXISTS bots_username_key;
        EXCEPTION
            WHEN undefined_object THEN NULL;
        END $$;
    """)
    
    # Удаляем уникальный индекс ix_bots_telegram_id и пересоздаём как обычный
    op.execute("DROP INDEX IF EXISTS ix_bots_telegram_id;")
    op.execute("CREATE INDEX IF NOT EXISTS ix_bots_telegram_id ON bots (telegram_id);")
    
    # Удаляем уникальный индекс ix_bots_username и пересоздаём как обычный
    op.execute("DROP INDEX IF EXISTS ix_bots_username;")
    op.execute("CREATE INDEX IF NOT EXISTS ix_bots_username ON bots (username);")
    
    # Создаём composite unique constraint на (owner_id, telegram_id) (если не существует)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE bots ADD CONSTRAINT bots_owner_telegram_unique UNIQUE (owner_id, telegram_id);
        EXCEPTION
            WHEN duplicate_table THEN NULL;
        END $$;
    """)


def downgrade() -> None:
    """
    Восстанавливаем уникальные constraints (может не сработать, если уже есть дубликаты)
    """
    # Удаляем composite constraint
    op.drop_constraint('bots_owner_telegram_unique', 'bots', type_='unique')
    
    # Восстанавливаем уникальность на token (может не сработать)
    op.create_unique_constraint('bots_token_key', 'bots', ['token'])
    
    # Восстанавливаем уникальность на telegram_id
    op.create_unique_constraint('bots_telegram_id_key', 'bots', ['telegram_id'])
    
    # Восстанавливаем уникальность на username
    try:
        op.create_unique_constraint('bots_username_key', 'bots', ['username'])
    except:
        pass
