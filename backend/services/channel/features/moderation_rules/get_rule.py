from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup, ChannelModerationRule


async def find_rule_or_404(
    db: AsyncSession,
    channel_id: int,
    rule_id: int,
    owner_id: int,
) -> ChannelModerationRule:
    """Возвращает правило модерации канала владельца или 404."""
    rule = (await db.execute(
        select(ChannelModerationRule)
        .join(ChannelGroup)
        .where(
            ChannelModerationRule.id == rule_id,
            ChannelModerationRule.channel_id == channel_id,
            ChannelGroup.owner_id == owner_id,
        )
    )).scalar_one_or_none()

    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule
