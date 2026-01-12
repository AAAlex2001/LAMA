"""Change media_blur from boolean to JSON array

Revision ID: 014_change_media_blur_to_json
Revises: 013_add_disable_notification
Create Date: 2026-01-13 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '014_change_media_blur_to_json'
down_revision = '013_add_disable_notification'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Изменяем тип колонки media_blur с Boolean на JSON
    # Сначала конвертируем существующие значения: true -> [true], false -> null
    op.execute("""
        ALTER TABLE publications 
        ALTER COLUMN media_blur TYPE JSON 
        USING CASE 
            WHEN media_blur = true THEN '[true]'::json
            ELSE NULL
        END
    """)


def downgrade() -> None:
    # Обратная конвертация: если массив содержит хоть один true -> true, иначе false
    op.execute("""
        ALTER TABLE publications 
        ALTER COLUMN media_blur TYPE BOOLEAN 
        USING CASE 
            WHEN media_blur IS NOT NULL AND media_blur::text LIKE '%true%' THEN true
            ELSE false
        END
    """)
