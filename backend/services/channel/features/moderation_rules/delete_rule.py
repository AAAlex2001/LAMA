from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.channel.features.moderation_rules.get_rule import find_rule_or_404


class DeleteModerationRule:
    """Удаляет правило модерации."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, rule_id: int, owner_id: int) -> None:
        """Удаляет правило. 404 если не найдено."""
        rule = await find_rule_or_404(self.db, channel_id, rule_id, owner_id)
        await self.db.delete(rule)
        await self.db.flush()
