"""Execute scheduled trigger task."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import ScheduledTriggerTask, Trigger
from backend.services.bot.features.triggers.fire.execute_trigger import ExecuteTrigger
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)


class ExecuteScheduledTriggerTask:
    """Execute scheduled trigger task if its trigger is still active."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, task: ScheduledTriggerTask, telegram_bot: RateLimitedBot) -> bool:
        trigger = (await self.db.execute(
            select(Trigger).where(Trigger.id == task.trigger_id)
        )).scalar_one_or_none()
        if not trigger or not trigger.is_active:
            await mark_executed(self.db, task)
            return False
        context = task.event_context if isinstance(task.event_context, dict) else {}
        try:
            await ExecuteTrigger(self.db).execute(trigger, task.user_id, task.chat_id, telegram_bot, context)
            await mark_executed(self.db, task)
            return True
        except Exception as exc:
            logger.error("Scheduled task %s failed: %s", task.id, exc)
            return False


async def mark_executed(db: AsyncSession, task: ScheduledTriggerTask) -> None:
    """Mark scheduled trigger task as executed."""
    task.is_executed = True
    task.executed_at = datetime.now(timezone.utc)
    await db.flush()