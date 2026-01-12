"""add repeat_custom_hours

Revision ID: 011_add_repeat_custom_hours
Revises: 010_add_color_to_tags
Create Date: 2026-01-12 14:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '011_add_repeat_custom_hours'
down_revision = '010_add_color_to_tags'
branch_labels = None
depends_on = None


def upgrade():
    # Add repeat_custom_hours column to publications table
    op.add_column('publications', sa.Column('repeat_custom_hours', sa.Integer(), nullable=True))


def downgrade():
    # Remove repeat_custom_hours column from publications table
    op.drop_column('publications', 'repeat_custom_hours')
