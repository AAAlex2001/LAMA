"""Load scheduled trigger tasks ready for execution."""

from datetime import datetime, timezone
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from backend.models.bots import ScheduledTriggerTask


async def get_pending_trigger_tasks(db: AsyncSession, limit: int = 100) -> List[ScheduledTriggerTask]:
    """Return unexecuted tasks whose execute_at is due."""
    result = await db.execute(
        select(ScheduledTriggerTask)
        .options(joinedload(ScheduledTriggerTask.trigger))
        .where(
            ScheduledTriggerTask.is_executed == False,
            ScheduledTriggerTask.execute_at <= datetime.now(timezone.utc),
        )
        .limit(limit)
    )
    return list(result.unique().scalars().all())