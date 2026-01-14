"""Add templates and template_contents tables

Revision ID: 015_add_templates_table
Revises: 014_change_media_blur_to_json
Create Date: 2026-01-14 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '015_add_templates_table'
down_revision = '014_change_media_blur_to_json'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_templates_id'), 'templates', ['id'], unique=False)
    op.create_index(op.f('ix_templates_slug'), 'templates', ['slug'], unique=True)

    op.create_table(
        'template_contents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('locale', sa.Enum('RU', 'SR', 'EN', name='locale'), nullable=False, server_default='RU'),
        sa.Column('headline', sa.String(length=500), nullable=True),
        sa.Column('lead', sa.Text(), nullable=True),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('cta_text', sa.String(length=255), nullable=True),
        sa.Column('cta_url', sa.String(length=512), nullable=True),
        sa.Column('images', sa.JSON(), nullable=True),
        sa.Column('blocks', sa.JSON(), nullable=True),
        sa.Column('faq', sa.JSON(), nullable=True),
        sa.Column('cards_block', sa.JSON(), nullable=True),
        sa.Column('subscribe_blocks', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['template_id'], ['templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_template_contents_id'), 'template_contents', ['id'], unique=False)
    op.create_index(op.f('ix_template_contents_template_id'), 'template_contents', ['template_id'], unique=False)
    op.create_index(op.f('ix_template_contents_locale'), 'template_contents', ['locale'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_template_contents_locale'), table_name='template_contents')
    op.drop_index(op.f('ix_template_contents_template_id'), table_name='template_contents')
    op.drop_index(op.f('ix_template_contents_id'), table_name='template_contents')
    op.drop_table('template_contents')
    
    op.drop_index(op.f('ix_templates_slug'), table_name='templates')
    op.drop_index(op.f('ix_templates_id'), table_name='templates')
    op.drop_table('templates')
