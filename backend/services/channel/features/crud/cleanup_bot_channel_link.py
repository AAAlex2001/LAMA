import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import RecurringMessage, ScheduledTriggerTask, Trigger

logger = logging.getLogger(__name__)


class CleanupBotChannelLink:
    """Чистит триггеры, отложенные задачи и рекуррентные сообщения, привязанные к каналу."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, channel_telegram_id: int) -> None:
        await cancel_scheduled_tasks(self.db, bot_id, channel_telegram_id)
        await drop_channel_from_recurring(self.db, bot_id, channel_telegram_id)
        await drop_channel_from_triggers(self.db, bot_id, channel_telegram_id)
        await self.db.flush()


async def cancel_scheduled_tasks(db: AsyncSession, bot_id: int, channel_telegram_id: int) -> None:
    """Отменить ещё не выполненные ScheduledTriggerTask для бота в канале."""
    tasks = list((await db.execute(
        select(ScheduledTriggerTask)
        .join(Trigger, ScheduledTriggerTask.trigger_id == Trigger.id)
        .where(
            Trigger.bot_id == bot_id,
            ScheduledTriggerTask.chat_id == channel_telegram_id,
            ScheduledTriggerTask.is_executed == False,
        )
    )).scalars().all())
    for task in tasks:
        task.is_executed = True
    if tasks:
        logger.info("Cancelled %d scheduled trigger tasks for bot %d, channel %d", len(tasks), bot_id, channel_telegram_id)


async def drop_channel_from_recurring(db: AsyncSession, bot_id: int, channel_telegram_id: int) -> None:
    """Убрать канал из target_chats всех активных рекуррентных сообщений бота."""
    messages = list((await db.execute(
        select(RecurringMessage).where(
            RecurringMessage.bot_id == bot_id,
            RecurringMessage.is_active == True,
        )
    )).scalars().all())
    for rm in messages:
        if channel_telegram_id not in rm.target_chats:
            continue
        rm.target_chats = [c for c in rm.target_chats if c != channel_telegram_id]
        if not rm.target_chats:
            rm.is_active = False
            logger.info("Deactivated recurring message %d (no target chats left)", rm.id)


async def drop_channel_from_triggers(db: AsyncSession, bot_id: int, channel_telegram_id: int) -> None:
    """Убрать канал из filters.chat_ids всех активных триггеров бота."""
    triggers = list((await db.execute(
        select(Trigger).where(
            Trigger.bot_id == bot_id,
            Trigger.is_active == True,
        )
    )).scalars().all())
    for trigger in triggers:
        if not trigger.filters or not isinstance(trigger.filters, dict):
            continue
        chat_ids = trigger.filters.get("chat_ids", [])
        if channel_telegram_id not in chat_ids:
            continue
        trigger.filters = {**trigger.filters, "chat_ids": [c for c in chat_ids if c != channel_telegram_id]}
