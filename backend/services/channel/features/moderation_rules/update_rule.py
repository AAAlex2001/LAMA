from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelModerationRule
from backend.schemas.channels import ChannelModerationRuleUpdate
from backend.services.channel.features.moderation_rules.get_rule import find_rule_or_404


class UpdateModerationRule:
    """Применяет частичное обновление к правилу модерации."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        rule_id: int,
        owner_id: int,
        data: ChannelModerationRuleUpdate,
    ) -> ChannelModerationRule:
        """Возвращает обновлённое правило. 404 если правило не найдено."""
        rule = await find_rule_or_404(self.db, channel_id, rule_id, owner_id)

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(rule, field, value)
        rule.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(rule)
        return rule
