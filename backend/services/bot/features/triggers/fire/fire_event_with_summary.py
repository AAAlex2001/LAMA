"""Run matching triggers and return summary."""

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import TriggerType
from backend.services.bot.features.triggers.fire.execute_trigger import ExecuteTrigger
from backend.services.bot.features.triggers.fire.get_active import get_active_triggers
from backend.services.bot.features.triggers.fire.matchers import matches_chat_type, matches_filters
from backend.services.bot.features.triggers.schedule.schedule_trigger import schedule_trigger
from backend.services.bot.features.triggers.trigger_summary import TriggerExecutionSummary
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)


class FireTriggerEventWithSummary:
    """Find active triggers for event, execute or schedule them, return summary."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        trigger_type: TriggerType,
        user_id: int,
        chat_id: int,
        telegram_bot: RateLimitedBot,
        context: Optional[Dict[str, Any]] = None,
        chat_type: Optional[str] = None,
    ) -> TriggerExecutionSummary:
        triggers = await get_active_triggers(self.db, bot_id, trigger_type)
        executed_ids: List[int] = []
        executed_names: List[str] = []
        executor = ExecuteTrigger(self.db)
        for trigger in triggers:
            if not matches_chat_type(trigger, chat_type):
                continue
            if not matches_filters(trigger, user_id, chat_id, context):
                continue
            if trigger.delay_minutes > 0:
                await schedule_trigger(self.db, trigger, user_id, chat_id, context)
                executed_ids.append(trigger.id)
                executed_names.append(trigger.name)
                continue
            try:
                if not await executor.execute(trigger, user_id, chat_id, telegram_bot, context):
                    continue
                executed_ids.append(trigger.id)
                executed_names.append(trigger.name)
            except Exception as exc:
                logger.error("Trigger %s execution failed: %s", trigger.id, exc)
        return TriggerExecutionSummary(len(executed_ids), executed_ids, executed_names)