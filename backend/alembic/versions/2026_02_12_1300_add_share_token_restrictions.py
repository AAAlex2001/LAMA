"""add share token restrictions

Revision ID: 026_add_share_token_restrictions
Revises: 025_add_share_token
Create Date: 2026-02-12 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '026_add_share_token_restrictions'
down_revision: Union[str, None] = '025_add_share_token'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add share_token_expires_at column
    op.add_column('publications', sa.Column('share_token_expires_at', sa.DateTime(timezone=True), nullable=True))
    
    # Add share_token_used column
    op.add_column('publications', sa.Column('share_token_used', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove columns
    op.drop_column('publications', 'share_token_used')
    op.drop_column('publications', 'share_token_expires_at')
