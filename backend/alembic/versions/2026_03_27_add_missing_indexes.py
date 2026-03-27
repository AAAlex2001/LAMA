"""add missing indexes for performance

Revision ID: 2026_03_27_indexes
Revises: 2026_03_26_ban
Create Date: 2026-03-27
"""
from alembic import op

revision = "2026_03_27_indexes"
down_revision = "2026_03_26_ban"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # CRITICAL: bots.token — queried on every webhook request
    op.create_index("ix_bots_token", "bots", ["token"])

    # CRITICAL: channel_groups.linked_chat_id — used in OR with telegram_id
    op.create_index("ix_channel_groups_linked_chat_id", "channel_groups", ["linked_chat_id"])

    # HIGH: channel_moderation_rules.channel_id — FK without index, hot path
    op.create_index("ix_channel_moderation_rules_channel_id", "channel_moderation_rules", ["channel_id"])

    # HIGH: backup_jobs FK columns
    op.create_index("ix_backup_jobs_owner_id", "backup_jobs", ["owner_id"])
    op.create_index("ix_backup_jobs_source_channel_id", "backup_jobs", ["source_channel_id"])
    op.create_index("ix_backup_jobs_target_channel_id", "backup_jobs", ["target_channel_id"])

    # HIGH: publications.series_id — FK without index
    op.create_index("ix_publications_series_id", "publications", ["series_id"])

    # HIGH: bot_commands.bot_id — FK without index
    op.create_index("ix_bot_commands_bot_id", "bot_commands", ["bot_id"])

    # HIGH: bot_auto_replies.bot_id — FK without index
    op.create_index("ix_bot_auto_replies_bot_id", "bot_auto_replies", ["bot_id"])

    # HIGH: pending_approvals.bot_id — FK without index, captcha hot path
    op.create_index("ix_pending_approvals_bot_id", "pending_approvals", ["bot_id"])

    # MEDIUM: scheduled_trigger_tasks composite for polling
    op.create_index(
        "ix_scheduled_trigger_tasks_exec",
        "scheduled_trigger_tasks",
        ["is_executed", "execute_at"],
    )

    # MEDIUM: publication_notifications.publication_id — FK for cascade deletes
    op.create_index("ix_publication_notifications_pub_id", "publication_notifications", ["publication_id"])

    # MEDIUM: publications.reply_to_post_id — self-referencing FK
    op.create_index("ix_publications_reply_to_post_id", "publications", ["reply_to_post_id"])

    # MEDIUM: channel_groups.backup_target_id — self-referencing FK
    op.create_index("ix_channel_groups_backup_target_id", "channel_groups", ["backup_target_id"])

    # MEDIUM: inbox_events nullable FKs
    op.create_index("ix_inbox_events_bot_id", "inbox_events", ["bot_id"])
    op.create_index("ix_inbox_events_channel_id", "inbox_events", ["channel_id"])


def downgrade() -> None:
    op.drop_index("ix_inbox_events_channel_id")
    op.drop_index("ix_inbox_events_bot_id")
    op.drop_index("ix_channel_groups_backup_target_id")
    op.drop_index("ix_publications_reply_to_post_id")
    op.drop_index("ix_publication_notifications_pub_id")
    op.drop_index("ix_scheduled_trigger_tasks_exec")
    op.drop_index("ix_pending_approvals_bot_id")
    op.drop_index("ix_bot_auto_replies_bot_id")
    op.drop_index("ix_bot_commands_bot_id")
    op.drop_index("ix_publications_series_id")
    op.drop_index("ix_backup_jobs_target_channel_id")
    op.drop_index("ix_backup_jobs_source_channel_id")
    op.drop_index("ix_backup_jobs_owner_id")
    op.drop_index("ix_channel_moderation_rules_channel_id")
    op.drop_index("ix_channel_groups_linked_chat_id")
    op.drop_index("ix_bots_token")
