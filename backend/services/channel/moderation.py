from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelModerationRule, ChannelGroup
from backend.schemas.channels import (
    ChannelModerationRuleCreate,
    ChannelModerationRuleUpdate,
)


class ChannelModerationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_rule(self, channel_id: int, data: ChannelModerationRuleCreate, owner_id: int):
        channel = await self.get_channel(channel_id, owner_id)
        if not channel:
            raise ValueError("Channel not found")

        rule = ChannelModerationRule(
            channel_id=channel_id,
            phrase=data.phrase,
            action=data.action,
            mute_duration_minutes=data.mute_duration_minutes,
        )
        self.db.add(rule)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def list_rules(self, channel_id: int, owner_id: int) -> List[ChannelModerationRule]:
        channel = await self.get_channel(channel_id, owner_id)
        if not channel:
            raise ValueError("Channel not found")

        query = select(ChannelModerationRule).where(
            ChannelModerationRule.channel_id == channel_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_rule(self, channel_id: int, rule_id: int, data: ChannelModerationRuleUpdate, owner_id: int):
        rule = await self.get_rule(channel_id, rule_id, owner_id)
        if not rule:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(rule, field, value)
        rule.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def delete_rule(self, channel_id: int, rule_id: int, owner_id: int) -> bool:
        rule = await self.get_rule(channel_id, rule_id, owner_id)
        if not rule:
            return False
        await self.db.delete(rule)
        await self.db.commit()
        return True

    async def check_message(self, channel_id: int, text: str) -> Optional[ChannelModerationRule]:
        query = select(ChannelModerationRule).where(
            ChannelModerationRule.channel_id == channel_id)
        result = await self.db.execute(query)
        lowered_text = text.lower()
        for rule in result.scalars():
            if rule.phrase.lower() in lowered_text:
                return rule
        return None

    async def check_message_by_telegram_id(self, telegram_id: int, text: str) -> Optional[ChannelModerationRule]:
        if not text:
            return None

        query = (
            select(ChannelModerationRule)
            .join(ChannelGroup)
            .where(ChannelGroup.telegram_id == telegram_id)
        )
        result = await self.db.execute(query)
        lowered_text = text.lower()
        for rule in result.scalars():
            if rule.phrase.lower() in lowered_text:
                return rule
        return None

    async def get_channel(self, channel_id: int, owner_id: int) -> Optional[ChannelGroup]:
        query = select(ChannelGroup).where(
            ChannelGroup.id == channel_id,
            ChannelGroup.owner_id == owner_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_rule(self, channel_id: int, rule_id: int, owner_id: int) -> Optional[ChannelModerationRule]:
        query = (
            select(ChannelModerationRule)
            .join(ChannelGroup)
            .where(
                ChannelModerationRule.id == rule_id,
                ChannelModerationRule.channel_id == channel_id,
                ChannelGroup.owner_id == owner_id,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
