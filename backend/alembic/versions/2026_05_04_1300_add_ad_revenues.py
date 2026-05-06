"""add ad_revenues table

Revision ID: add_ad_revenues
Revises: drop_channel_flood_states
Create Date: 2026-05-04 13:00:00.000000
"""

import sqlalchemy as sa
from alembic import op


revision = "add_ad_revenues"
down_revision = "drop_channel_flood_states"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ad_revenues",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("buyer", sa.String(length=255), nullable=True),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="RUB"),
        sa.Column("revenue_date", sa.Date(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("publication_id", sa.Integer(), sa.ForeignKey("publications.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("channel_id", sa.Integer(), sa.ForeignKey("channel_groups.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("bot_id", sa.Integer(), sa.ForeignKey("bots.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_ad_revenues_owner_date", "ad_revenues", ["owner_id", "revenue_date"])
    op.create_index("ix_ad_revenues_owner_type_date", "ad_revenues", ["owner_id", "type", "revenue_date"])


def downgrade() -> None:
    op.drop_index("ix_ad_revenues_owner_type_date", table_name="ad_revenues")
    op.drop_index("ix_ad_revenues_owner_date", table_name="ad_revenues")
    op.drop_table("ad_revenues")
