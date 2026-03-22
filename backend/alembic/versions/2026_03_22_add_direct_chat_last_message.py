"""add last_message columns to direct_chats and inbox_events index

Revision ID: 2026_03_22_last_msg
Revises: 2026_03_22_banned_words
Create Date: 2026-03-22
"""

from alembic import op
import sqlalchemy as sa

revision = "2026_03_22_last_msg"
down_revision = "2026_03_22_banned_words"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "direct_chats",
        sa.Column("last_message_text", sa.String(), nullable=True),
    )
    op.add_column(
        "direct_chats",
        sa.Column(
            "last_message_type",
            sa.Enum("TEXT", "PHOTO", "VIDEO", "DOCUMENT", "AUDIO", "VOICE", "STICKER", "ANIMATION", name="messagetype", create_type=False),
            nullable=True,
        ),
    )
    op.add_column(
        "direct_chats",
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute("""
        UPDATE direct_chats dc
        SET last_message_text = sub.text_content,
            last_message_type = sub.message_type,
            last_message_at = sub.created_at
        FROM (
            SELECT DISTINCT ON (bot_id, chat_id)
                bot_id, chat_id, text_content, message_type, created_at
            FROM bot_messages
            ORDER BY bot_id, chat_id, created_at DESC
        ) sub
        WHERE dc.bot_id = sub.bot_id AND dc.tg_chat_id = sub.chat_id
    """)

    op.create_index(
        "ix_inbox_events_owner_category_created",
        "inbox_events",
        ["owner_id", "category", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_inbox_events_owner_category_created", table_name="inbox_events")
    op.drop_column("direct_chats", "last_message_at")
    op.drop_column("direct_chats", "last_message_type")
    op.drop_column("direct_chats", "last_message_text")
