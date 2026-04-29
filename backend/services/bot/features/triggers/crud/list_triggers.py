"""List triggers use-case."""

from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, Trigger, TriggerType


class ListTriggers:
    """List triggers for a bot, optionally filtered by type/activity."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        trigger_type: Optional[TriggerType] = None,
        is_active: Optional[bool] = None,
        owner_id: Optional[int] = None,
    ) -> Tuple[List[Trigger], int]:
        query = select(Trigger).where(Trigger.bot_id == bot_id)
        if owner_id is not None:
            query = query.join(BotModel).where(BotModel.owner_id == owner_id)
        if trigger_type is not None:
            query = query.where(Trigger.trigger_type == trigger_type)
        if is_active is not None:
            query = query.where(Trigger.is_active == is_active)
        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
        rows = (await self.db.execute(query.order_by(Trigger.created_at.desc()))).scalars().all()
        return list(rows), total