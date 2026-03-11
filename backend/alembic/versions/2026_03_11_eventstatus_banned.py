"""add_banned_to_eventstatus

Revision ID: 2026_03_11_eve_banned
Revises: 2026_03_10_batch4
Create Date: 2026-03-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2026_03_11_eve_banned'
down_revision = '2026_03_10_batch4'

def upgrade() -> None:
    # Add BANNED to eventstatus enum type. Since this is an ENUM, 
    # we need to be careful with postgresql.
    # The current enum has 'NEW', 'PROCESSED', 'IGNORED'. We will add 'BANNED'.
    # Note: postgresql enum members are case-sensitive!
    # Our DB actually expected uppercase based on past python enum usage.
    op.execute("ALTER TYPE eventstatus ADD VALUE IF NOT EXISTS 'BANNED'")

def downgrade() -> None:
    # Postgres doesn't easily support removing enum values.
    # Therefore, no-op for downgrade.
    pass
