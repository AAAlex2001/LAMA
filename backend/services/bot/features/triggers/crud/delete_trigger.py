"""Delete trigger use-case."""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot.features.triggers.lookup import find_trigger_or_404


class DeleteTrigger:
    """Delete trigger by ID and optional owner."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, trigger_id: int, owner_id: Optional[int] = None) -> None:
        trigger = await find_trigger_or_404(self.db, trigger_id, owner_id)
        await self.db.delete(trigger)
        await self.db.flush()