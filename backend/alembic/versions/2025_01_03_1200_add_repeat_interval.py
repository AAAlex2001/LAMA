"""add repeat interval

Revision ID: 009_add_repeat_interval
Revises: 008_add_email_password
Create Date: 2025-01-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
 


# revision identifiers, used by Alembic.
revision: str = '009_add_repeat_interval'
down_revision: Union[str, None] = '008_add_email_password'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure enum type exists and has lowercase labels.
    # Previous attempts (or autogenerate) may have created values like 'NEVER', 'DAILY', ...
    # which then makes inserting 'never' fail.
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'repeatinterval') THEN
                CREATE TYPE repeatinterval AS ENUM ('never', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'custom');
            ELSE
                -- Rename uppercase enum values to lowercase when needed.
                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'NEVER'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'never'
                ) THEN
                    EXECUTE 'ALTER TYPE repeatinterval RENAME VALUE ''NEVER'' TO ''never''';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'DAILY'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'daily'
                ) THEN
                    EXECUTE 'ALTER TYPE repeatinterval RENAME VALUE ''DAILY'' TO ''daily''';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'WEEKLY'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'weekly'
                ) THEN
                    EXECUTE 'ALTER TYPE repeatinterval RENAME VALUE ''WEEKLY'' TO ''weekly''';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'BIWEEKLY'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'biweekly'
                ) THEN
                    EXECUTE 'ALTER TYPE repeatinterval RENAME VALUE ''BIWEEKLY'' TO ''biweekly''';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'MONTHLY'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'monthly'
                ) THEN
                    EXECUTE 'ALTER TYPE repeatinterval RENAME VALUE ''MONTHLY'' TO ''monthly''';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'YEARLY'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'yearly'
                ) THEN
                    EXECUTE 'ALTER TYPE repeatinterval RENAME VALUE ''YEARLY'' TO ''yearly''';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'CUSTOM'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'repeatinterval' AND e.enumlabel = 'custom'
                ) THEN
                    EXECUTE 'ALTER TYPE repeatinterval RENAME VALUE ''CUSTOM'' TO ''custom''';
                END IF;
            END IF;
        END $$;
    """)
    
    # Add columns
    # Add repeat_interval as nullable first
    op.execute("ALTER TABLE publications ADD COLUMN IF NOT EXISTS repeat_interval repeatinterval")
    # Set default for existing rows
    op.execute("UPDATE publications SET repeat_interval = 'never'::repeatinterval WHERE repeat_interval IS NULL")
    # Make NOT NULL
    op.execute("ALTER TABLE publications ALTER COLUMN repeat_interval SET NOT NULL")
    # Set default for future rows
    op.execute("ALTER TABLE publications ALTER COLUMN repeat_interval SET DEFAULT 'never'::repeatinterval")
    
    op.execute("ALTER TABLE publications ADD COLUMN IF NOT EXISTS repeat_custom_days INTEGER")
    op.execute("ALTER TABLE publications ADD COLUMN IF NOT EXISTS next_repeat_time TIMESTAMP WITH TIME ZONE")


def downgrade() -> None:
    op.drop_column('publications', 'next_repeat_time')
    op.drop_column('publications', 'repeat_custom_days')
    op.drop_column('publications', 'repeat_interval')
    
    # Drop the enum type
    op.execute('DROP TYPE IF EXISTS repeatinterval')
