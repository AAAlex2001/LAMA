from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup, ChannelModerationRule
from backend.schemas.channels import ChannelModerationRuleCreate, ChannelModerationRuleUpdate
from backend.services.channel.chat_permissions_service import ChatPermissionsService
from backend.services.channel.utils.query_utils import get_channel


class ModerationService:
    """CRUD и проверка правил модерации."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_rule(self, channel_id: int, data: ChannelModerationRuleCreate, owner_id: int) -> ChannelModerationRule:
        """Создать правило модерации."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        rule = ChannelModerationRule(
            channel_id=channel_id,
            phrase=data.phrase,
            action=data.action,
            mute_duration_minutes=data.mute_duration_minutes,
        )
        self.db.add(rule)
        await self.db.flush()
        await self.db.refresh(rule)
        return rule

    async def list_rules(self, channel_id: int, owner_id: int) -> List[ChannelModerationRule]:
        """Получить список правил."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        query = select(ChannelModerationRule).where(ChannelModerationRule.channel_id == channel_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_rule(
        self,
        channel_id: int,
        rule_id: int,
        data: ChannelModerationRuleUpdate,
        owner_id: int,
    ) -> ChannelModerationRule:
        """Обновить правило."""
        rule = await self.get_rule(channel_id, rule_id, owner_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(rule, field, value)
        rule.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(rule)
        return rule

    async def delete_rule(self, channel_id: int, rule_id: int, owner_id: int) -> bool:
        """Удалить правило."""
        rule = await self.get_rule(channel_id, rule_id, owner_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        await self.db.delete(rule)
        await self.db.flush()
        return True

    async def check_message(self, channel_id: int, text: str) -> Optional[ChannelModerationRule]:
        """Проверить сообщение на запрещённые фразы."""
        query = select(ChannelModerationRule).where(ChannelModerationRule.channel_id == channel_id)
        result = await self.db.execute(query)
        lowered = text.lower()
        for rule in result.scalars():
            if rule.phrase.lower() in lowered:
                return rule
        return None

    async def check_message_by_telegram_id(self, telegram_id: int, text: str) -> Optional[ChannelModerationRule]:
        """Проверить сообщение по Telegram ID канала."""
        if not text:
            return None

        query = (
            select(ChannelModerationRule)
            .join(ChannelGroup)
            .where(ChannelGroup.telegram_id == telegram_id)
        )
        result = await self.db.execute(query)
        lowered = text.lower()
        for rule in result.scalars():
            if rule.phrase.lower() in lowered:
                return rule
        return None

    async def toggle_banned_words(self, channel_id: int, enabled: bool, owner_id: int) -> ChannelGroup:
        """Включить/выключить запрещённые слова."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        channel.banned_words_enabled = enabled
        return channel

    async def update_quick_commands(
        self,
        channel_id: int,
        commands_enabled: bool,
        enabled_commands: Optional[List[str]],
        owner_id: int,
    ) -> ChannelGroup:
        """Обновить настройки быстрых команд."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        channel.commands_enabled = commands_enabled
        channel.enabled_commands = enabled_commands
        return channel

    async def update_media_block(
        self,
        channel_id: int,
        block_media_types: Optional[List[str]],
        owner_id: int,
    ) -> ChannelGroup:
        """Обновить блокировку медиа и применить permissions."""
        channel = await get_channel(self.db, channel_id, owner_id, load_bot=True)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        channel.block_media_types = block_media_types

        perms_service = ChatPermissionsService(self.db)
        await perms_service.apply_permissions(channel)

        return channel

    async def get_rule(self, channel_id: int, rule_id: int, owner_id: int) -> Optional[ChannelModerationRule]:
        """Получить правило с проверкой."""
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
