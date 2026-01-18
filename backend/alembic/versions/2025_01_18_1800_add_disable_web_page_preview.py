"""add disable_web_page_preview

Revision ID: 019_add_disable_web_page_preview
Revises: 018_add_media_thumbnail_urls
Create Date: 2026-01-18 18:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '019_add_disable_web_page_preview'
down_revision: Union[str, None] = '018_add_media_thumbnail_urls'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поле disable_web_page_preview с дефолтным значением True
    op.add_column('publications', sa.Column('disable_web_page_preview', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    # Удаляем поле при откате миграции
    op.drop_column('publications', 'disable_web_page_preview')
