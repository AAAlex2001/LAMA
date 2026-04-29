from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelModerationRule


class CheckMessageAgainstRules:
    """Проверяет текст сообщения на запрещённые фразы канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, text: str) -> Optional[ChannelModerationRule]:
        """Возвращает первое сработавшее правило или None."""
        if not text:
            return None

        rules = (await self.db.execute(
            select(ChannelModerationRule).where(ChannelModerationRule.channel_id == channel_id)
        )).scalars().all()

        lowered = text.lower()
        for rule in rules:
            if rule.phrase.lower() in lowered:
                return rule
        return None
