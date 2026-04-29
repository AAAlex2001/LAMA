"""Create trigger use-case."""

from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Trigger, TriggerActionType, TriggerChatType, TriggerType
from backend.services.bot.features.triggers.lookup import ensure_bot_exists


class CreateTrigger:
    """Create Trigger after checking bot ownership."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        name: str,
        trigger_type: TriggerType,
        action_type: TriggerActionType,
        action_data: Optional[Dict[str, Any]] = None,
        delay_minutes: int = 0,
        delivery_window: Optional[Dict[str, Any]] = None,
        filters_data: Optional[Dict[str, Any]] = None,
        chat_type: Optional[TriggerChatType] = None,
        is_active: bool = True,
        owner_id: Optional[int] = None,
    ) -> Trigger:
        await ensure_bot_exists(self.db, bot_id, owner_id)
        trigger = Trigger(
            bot_id=bot_id,
            name=name,
            trigger_type=trigger_type,
            action_type=action_type,
            action_data=action_data,
            delay_minutes=delay_minutes,
            delivery_window=delivery_window,
            filters=filters_data,
            chat_type=chat_type or TriggerChatType.BOTH,
            is_active=is_active,
        )
        self.db.add(trigger)
        await self.db.flush()
        await self.db.refresh(trigger)
        return trigger