"""add publications.is_ad

Revision ID: pub_is_ad
Revises: add_ad_revenues
Create Date: 2026-05-14 10:00:00.000000
"""

import sqlalchemy as sa
from alembic import op


revision = "pub_is_ad"
down_revision = "add_ad_revenues"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "publications",
        sa.Column("is_ad", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index(
        "ix_publications_owner_is_ad",
        "publications",
        ["owner_id", "is_ad"],
    )


def downgrade() -> None:
    op.drop_index("ix_publications_owner_is_ad", table_name="publications")
    op.drop_column("publications", "is_ad")
