from datetime import datetime, timezone, timedelta
from typing import List, Optional

import asyncio
import logging
from fastapi import HTTPException

from sqlalchemy import select, func, distinct, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.bots import RecurringMessage, ScheduledTriggerTask, Trigger
from backend.models.channels import ChannelGroup, ChannelType, BackupMode
from backend.schemas.channels import ChannelGroupCreate, ChannelGroupUpdate
from backend.services.bot_provider import get_cached_bot
from backend.services.channel.utils.chat_data_utils import build_chat_data

logger = logging.getLogger(__name__)

REFRESH_THRESHOLD = timedelta(minutes=5)


class ChannelService:
    """CRUD операции с каналами."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: ChannelGroupCreate, owner_id: int) -> ChannelGroup:
        """Создать канал с проверкой на дубликат."""
        query = select(ChannelGroup).where(
            ChannelGroup.telegram_id == data.telegram_id,
            ChannelGroup.owner_id == owner_id,
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        channel = ChannelGroup(
            owner_id=owner_id,
            telegram_id=data.telegram_id,
            channel_type=data.channel_type,
            title=data.title,
            username=data.username,
            description=data.description,
            is_active=True,
        )
        self.db.add(channel)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel

    async def get(self, channel_id: int, owner_id: Optional[int] = None) -> ChannelGroup:
        """Получить канал по ID."""
        query = select(ChannelGroup).options(selectinload(ChannelGroup.bot)).where(
            ChannelGroup.id == channel_id,
        )
        if owner_id is not None:
            query = query.where(ChannelGroup.owner_id == owner_id)
        result = await self.db.execute(query)
        channel = result.scalar_one_or_none()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        return channel

    async def get_by_telegram_id(self, telegram_id: int) -> ChannelGroup:
        """Получить канал по Telegram ID."""
        query = select(ChannelGroup).where(ChannelGroup.telegram_id == telegram_id)
        result = await self.db.execute(query)
        channel = result.scalar_one_or_none()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        return channel

    async def list(
        self,
        owner_id: int,
        page: int = 1,
        page_size: int = 50,
        channel_type: Optional[ChannelType] = None,
        is_active: Optional[bool] = None,
        backup_mode: Optional[BackupMode] = None,
        force_refresh: bool = False,
    ) -> tuple[List[ChannelGroup], int]:
        """Список каналов с фильтрацией."""
        query = select(ChannelGroup).options(selectinload(ChannelGroup.bot)).where(ChannelGroup.owner_id == owner_id)
        count_query = select(func.count(distinct(ChannelGroup.id))).where(
            ChannelGroup.owner_id == owner_id,
        )

        if channel_type:
            query = query.where(ChannelGroup.channel_type == channel_type)
            count_query = count_query.where(ChannelGroup.channel_type == channel_type)
        if is_active is not None:
            query = query.where(ChannelGroup.is_active == is_active)
            count_query = count_query.where(ChannelGroup.is_active == is_active)
        if backup_mode:
            query = query.where(ChannelGroup.backup_mode == backup_mode)
            count_query = count_query.where(ChannelGroup.backup_mode == backup_mode)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(ChannelGroup.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        channels = list(result.scalars().all())

        if force_refresh:
            await self.refresh_stale_channels(channels, force=True)

        return channels, total

    async def refresh_stale_channels(self, channels: List[ChannelGroup], force: bool = False) -> None:
        """Обновить данные каналов из Telegram, если last_sync_at устарел."""
        now = datetime.now(timezone.utc)
        if force:
            stale = [ch for ch in channels if ch.bot and ch.bot.token]
        else:
            stale = [
                ch for ch in channels
                if ch.bot and ch.bot.token
                and (not ch.last_sync_at or now - ch.last_sync_at > REFRESH_THRESHOLD)
            ]
        if not stale:
            return

        async def refresh_one(channel: ChannelGroup) -> None:
            try:
                bot = get_cached_bot(channel.bot.token)
                chat = await bot.get_chat(channel.telegram_id)
                chat_data = await build_chat_data(bot, chat, channel.bot.token)
                for field, value in chat_data.items():
                    setattr(channel, field, value)
                channel.last_sync_at = now
                channel.updated_at = now
            except Exception as e:
                logger.debug("Failed to refresh channel %s: %s", channel.id, e)

        await asyncio.gather(*[refresh_one(ch) for ch in stale])
        await self.db.flush()

    async def update(self, channel_id: int, data: ChannelGroupUpdate, owner_id: int) -> ChannelGroup:
        """Обновить канал."""
        channel = await self.get(channel_id, owner_id=owner_id)

        update_data = data.model_dump(exclude_unset=True)

        if update_data.pop('clear_bot', False):
            old_bot_id = channel.bot_id
            channel_tg_id = channel.telegram_id
            channel.bot_id = None
            channel.is_bot_active = True
            if old_bot_id and channel_tg_id:
                await self.cleanup_bot_channel_link(old_bot_id, channel_tg_id)

        for field, value in update_data.items():
            setattr(channel, field, value)

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel

    async def cleanup_bot_channel_link(self, bot_id: int, channel_telegram_id: int) -> None:
        """Очистить все связи бота с каналом: триггеры, отложенные задачи, рекуррентные сообщения."""
        scheduled_query = (
            select(ScheduledTriggerTask)
            .join(Trigger, ScheduledTriggerTask.trigger_id == Trigger.id)
            .where(
                Trigger.bot_id == bot_id,
                ScheduledTriggerTask.chat_id == channel_telegram_id,
                ScheduledTriggerTask.is_executed == False,
            )
        )
        result = await self.db.execute(scheduled_query)
        tasks = list(result.scalars().all())
        for task in tasks:
            task.is_executed = True
        if tasks:
            logger.info("Cancelled %d scheduled trigger tasks for bot %d, channel %d", len(tasks), bot_id, channel_telegram_id)

        recurring_query = select(RecurringMessage).where(
            RecurringMessage.bot_id == bot_id,
            RecurringMessage.is_active == True,
        )
        result = await self.db.execute(recurring_query)
        recurring_messages = list(result.scalars().all())
        for rm in recurring_messages:
            if channel_telegram_id in rm.target_chats:
                new_targets = [c for c in rm.target_chats if c != channel_telegram_id]
                rm.target_chats = new_targets
                if not new_targets:
                    rm.is_active = False
                    logger.info("Deactivated recurring message %d (no target chats left)", rm.id)

        trigger_query = select(Trigger).where(
            Trigger.bot_id == bot_id,
            Trigger.is_active == True,
        )
        result = await self.db.execute(trigger_query)
        triggers = list(result.scalars().all())
        for trigger in triggers:
            if trigger.filters and isinstance(trigger.filters, dict):
                chat_ids = trigger.filters.get("chat_ids", [])
                if channel_telegram_id in chat_ids:
                    new_chat_ids = [c for c in chat_ids if c != channel_telegram_id]
                    trigger.filters = {**trigger.filters, "chat_ids": new_chat_ids}

        await self.db.flush()

    async def delete(self, channel_id: int, owner_id: int) -> bool:
        """Удалить канал."""
        channel = await self.get(channel_id, owner_id=owner_id)
        await self.db.delete(channel)
        await self.db.flush()
        return True
