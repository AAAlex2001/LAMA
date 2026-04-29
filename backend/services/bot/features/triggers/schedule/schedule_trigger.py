"""Schedule delayed trigger execution."""

from datetime import datetime, timedelta, timezone
from typing import Optional

import pytz
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import ScheduledTriggerTask, Trigger
from backend.services.bot.features.triggers.timezone_resolver import resolve_tz


async def schedule_trigger(
    db: AsyncSession, trigger: Trigger, user_id: int, chat_id: int, context: Optional[dict],
) -> None:
    """Schedule trigger after its delay_minutes value."""
    db.add(ScheduledTriggerTask(
        trigger_id=trigger.id,
        user_id=user_id,
        chat_id=chat_id,
        execute_at=datetime.now(timezone.utc) + timedelta(minutes=trigger.delay_minutes),
        event_context=context,
    ))
    await db.flush()


async def schedule_for_next_window(
    db: AsyncSession, trigger: Trigger, user_id: int, chat_id: int, context: Optional[dict],
) -> None:
    """Schedule trigger for the start of its next delivery window."""
    window = trigger.delivery_window
    if not window or not isinstance(window, dict):
        return
    timezone_value = resolve_tz(window.get("timezone", "UTC"))
    now = datetime.now(timezone_value)
    start_hour = window.get("start_hour", 9)
    if now.hour >= start_hour:
        next_window = now.replace(hour=start_hour, minute=0, second=0) + timedelta(days=1)
    else:
        next_window = now.replace(hour=start_hour, minute=0, second=0)
    db.add(ScheduledTriggerTask(
        trigger_id=trigger.id,
        user_id=user_id,
        chat_id=chat_id,
        execute_at=next_window.astimezone(pytz.UTC),
        event_context=context,
    ))
    await db.flush()