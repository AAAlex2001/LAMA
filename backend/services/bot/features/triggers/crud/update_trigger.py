"""Update trigger use-case."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Trigger
from backend.services.bot.features.triggers.lookup import find_trigger_or_404


class UpdateTrigger:
    """Update supplied trigger fields, ignoring None values."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, trigger_id: int, owner_id: Optional[int] = None, **fields) -> Trigger:
        trigger = await find_trigger_or_404(self.db, trigger_id, owner_id)
        for key, value in fields.items():
            if hasattr(trigger, key) and value is not None:
                setattr(trigger, key, value)
        trigger.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(trigger)
        return trigger