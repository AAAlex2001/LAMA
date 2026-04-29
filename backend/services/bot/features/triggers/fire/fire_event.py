"""Run matching triggers and return executed count."""

from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import TriggerType
from backend.services.bot.features.triggers.fire.fire_event_with_summary import FireTriggerEventWithSummary
from backend.services.telegram_client import RateLimitedBot


class FireTriggerEvent:
    """Thin count-returning entrypoint for trigger firing."""

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
    ) -> int:
        summary = await FireTriggerEventWithSummary(self.db).execute(
            bot_id, trigger_type, user_id, chat_id, telegram_bot, context, chat_type,
        )
        return summary.executed_count