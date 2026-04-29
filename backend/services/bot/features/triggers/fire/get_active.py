"""Load active triggers for an event type."""

from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Trigger, TriggerType


async def get_active_triggers(db: AsyncSession, bot_id: int, trigger_type: TriggerType) -> List[Trigger]:
    """Return active triggers for bot and trigger type."""
    result = await db.execute(
        select(Trigger).where(
            Trigger.bot_id == bot_id,
            Trigger.trigger_type == trigger_type,
            Trigger.is_active == True,
        )
    )
    return list(result.scalars().all())