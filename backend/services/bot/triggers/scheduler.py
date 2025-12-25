"""
Планировщик отложенных триггеров
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram import Bot

from backend.models.bots import Trigger, ScheduledTriggerTask

logger = logging.getLogger(__name__)


async def schedule_trigger(
    db: AsyncSession,
    trigger: Trigger,
    user_id: int,
    chat_id: int,
    context: Optional[Dict[str, Any]] = None,
):
    """Запланировать отложенный триггер"""
    execute_at = datetime.now(timezone.utc) + timedelta(minutes=trigger.delay_minutes)

    task = ScheduledTriggerTask(
        trigger_id=trigger.id,
        user_id=user_id,
        chat_id=chat_id,
        execute_at=execute_at,
        event_context=context,
    )

    db.add(task)
    await db.commit()


async def schedule_for_next_window(
    db: AsyncSession,
    trigger: Trigger,
    user_id: int,
    chat_id: int,
    context: Optional[Dict[str, Any]] = None,
):
    """Запланировать на следующее окно доставки"""
    import pytz

    if not trigger.delivery_window or not isinstance(trigger.delivery_window, dict):
        return

    tz_name = trigger.delivery_window.get("timezone", "UTC")
    try:
        tz = pytz.timezone(tz_name)
    except pytz.UnknownTimeZoneError:
        tz = pytz.UTC

    now = datetime.now(tz)
    start_hour = trigger.delivery_window.get("start_hour", 9)

    if now.hour >= start_hour:
        next_window = now.replace(hour=start_hour, minute=0, second=0) + timedelta(days=1)
    else:
        next_window = now.replace(hour=start_hour, minute=0, second=0)

    execute_at = next_window.astimezone(pytz.UTC)

    task = ScheduledTriggerTask(
        trigger_id=trigger.id,
        user_id=user_id,
        chat_id=chat_id,
        execute_at=execute_at,
        event_context=context,
    )

    db.add(task)
    await db.commit()


async def get_pending_tasks(db: AsyncSession, limit: int = 100) -> List[ScheduledTriggerTask]:
    """Получить задачи, готовые к выполнению"""
    now = datetime.now(timezone.utc)
    query = select(ScheduledTriggerTask).where(
        ScheduledTriggerTask.is_executed == False,
        ScheduledTriggerTask.execute_at <= now,
    ).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


async def execute_scheduled_task(
    db: AsyncSession,
    task: ScheduledTriggerTask,
    telegram_bot: Bot,
    execute_trigger_func,
) -> bool:
    """Выполнить отложенную задачу"""
    query = select(Trigger).where(Trigger.id == task.trigger_id)
    result = await db.execute(query)
    trigger = result.scalar_one_or_none()

    if not trigger or not trigger.is_active:
        task.is_executed = True
        task.executed_at = datetime.now(timezone.utc)
        await db.commit()
        return False

    event_context = task.event_context
    if not isinstance(event_context, dict):
        event_context = {}

    try:
        await execute_trigger_func(
            trigger,
            task.user_id,
            task.chat_id,
            telegram_bot,
            event_context,
        )
        task.is_executed = True
        task.executed_at = datetime.now(timezone.utc)
        await db.commit()
        return True
    except Exception as e:
        logger.error(f"Scheduled task {task.id} failed: {e}")
        return False
