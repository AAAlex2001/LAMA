"""add button_clicks table

Revision ID: 028_add_button_clicks
Revises: 027_add_missing_indexes
Create Date: 2026-02-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '028_add_button_clicks'
down_revision: Union[str, None] = '027_add_missing_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'button_clicks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('publication_id', sa.Integer(), sa.ForeignKey('publications.id', ondelete='CASCADE'), nullable=False),
        sa.Column('button_id', sa.String(64), nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('clicked_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_button_clicks_publication_id', 'button_clicks', ['publication_id'])
    op.create_index('ix_button_clicks_pub_btn', 'button_clicks', ['publication_id', 'button_id'])
    op.create_index('ix_button_clicks_pub_btn_user', 'button_clicks', ['publication_id', 'button_id', 'user_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_button_clicks_pub_btn_user', table_name='button_clicks')
    op.drop_index('ix_button_clicks_pub_btn', table_name='button_clicks')
    op.drop_index('ix_button_clicks_publication_id', table_name='button_clicks')
    op.drop_table('button_clicks')
