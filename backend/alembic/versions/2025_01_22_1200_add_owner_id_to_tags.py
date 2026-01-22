"""add owner_id to tags

Revision ID: 2025_01_22_1200
Revises: 
Create Date: 2025-01-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2025_01_22_1200_add_owner_id_to_tags'
down_revision: Union[str, None] = '021_add_reply_to_post_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add owner_id column (nullable first for existing data)
    op.add_column('tags', sa.Column('owner_id', sa.Integer(), nullable=True))
    
    # Remove old unique constraint on name (if exists)
    op.drop_constraint('tags_name_key', 'tags', type_='unique', if_exists=True)
    
    # Create foreign key
    op.create_foreign_key(
        'fk_tags_owner_id', 
        'tags', 
        'users', 
        ['owner_id'], 
        ['id'],
        ondelete='CASCADE'
    )
    
    # Create index on owner_id
    op.create_index('ix_tags_owner_id', 'tags', ['owner_id'], unique=False)
    
    # Create composite unique index (owner_id, name)
    op.create_index('ix_tags_owner_name', 'tags', ['owner_id', 'name'], unique=True)


def downgrade() -> None:
    # Remove composite unique index
    op.drop_index('ix_tags_owner_name', 'tags')
    
    # Remove index on owner_id
    op.drop_index('ix_tags_owner_id', 'tags')
    
    # Remove foreign key
    op.drop_constraint('fk_tags_owner_id', 'tags', type_='foreignkey')
    
    # Remove owner_id column
    op.drop_column('tags', 'owner_id')
    
    # Restore unique constraint on name
    op.create_unique_constraint('tags_name_key', 'tags', ['name'])
