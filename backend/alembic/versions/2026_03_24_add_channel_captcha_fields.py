"""add captcha fields to channel_groups

Revision ID: 2026_03_24_captcha
Revises: 2026_03_23_auto_delete_ext
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa

revision = "2026_03_24_captcha"
down_revision = "2026_03_23_auto_delete_ext"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DO $$ BEGIN CREATE TYPE captchafailaction AS ENUM ('KICK', 'MUTE', 'BAN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$")

    op.add_column(
        "channel_groups",
        sa.Column("captcha_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "channel_groups",
        sa.Column("captcha_timeout_seconds", sa.Integer(), nullable=False, server_default="30"),
    )
    op.add_column(
        "channel_groups",
        sa.Column(
            "captcha_fail_action",
            sa.Enum("KICK", "MUTE", "BAN", name="captchafailaction", create_type=False),
            nullable=False,
            server_default="KICK",
        ),
    )
    op.add_column(
        "channel_groups",
        sa.Column("captcha_fail_duration_seconds", sa.Integer(), nullable=True),
    )
    op.add_column(
        "channel_groups",
        sa.Column("captcha_restriction_type", sa.String(32), nullable=True, server_default="send_messages"),
    )
    op.add_column(
        "channel_groups",
        sa.Column("captcha_message_before", sa.Text(), nullable=True),
    )
    op.add_column(
        "channel_groups",
        sa.Column("captcha_message_fail", sa.Text(), nullable=True),
    )
    op.add_column(
        "channel_groups",
        sa.Column("captcha_message_success", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("channel_groups", "captcha_message_success")
    op.drop_column("channel_groups", "captcha_message_fail")
    op.drop_column("channel_groups", "captcha_message_before")
    op.drop_column("channel_groups", "captcha_restriction_type")
    op.drop_column("channel_groups", "captcha_fail_duration_seconds")
    op.drop_column("channel_groups", "captcha_fail_action")
    op.drop_column("channel_groups", "captcha_timeout_seconds")
    op.drop_column("channel_groups", "captcha_enabled")
    op.execute("DROP TYPE IF EXISTS captchafailaction")
