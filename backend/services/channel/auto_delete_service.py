import logging
from typing import Optional

from aiogram.exceptions import TelegramAPIError
from aiogram.types import Message
from fastapi import HTTPException
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelAutoDeleteSettings, ChannelGroup
from backend.schemas.channels import ChannelAutoDeleteSettingsUpdate
from backend.services.channel.utils.message_utils import (
    is_command_message, is_system_message, is_join_message,
    is_text_only_message, is_media_message,
)
from backend.services.channel.utils.query_utils import get_channel
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)


class AutoDeleteService:
    """Управление автоудалением сообщений."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_settings(self, channel_id: int, owner_id: int) -> ChannelAutoDeleteSettings:
        """Получить настройки автоудаления для канала."""
        channel = await get_channel(self.db, channel_id, owner_id, load_auto_delete=True)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        return await self.ensure_settings(channel)

    async def update_settings(
        self,
        channel_id: int,
        data: ChannelAutoDeleteSettingsUpdate,
        owner_id: int,
    ) -> ChannelAutoDeleteSettings:
        """Обновить настройки автоудаления."""
        channel = await get_channel(self.db, channel_id, owner_id, load_auto_delete=True)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        settings = await self.ensure_settings(channel)
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settings, field, value)

        await self.db.flush()
        await self.db.refresh(settings)
        return settings

    async def resolve_settings(self, telegram_id: int) -> Optional[ChannelAutoDeleteSettings]:
        """Получить настройки по Telegram ID с кешем на время обработки."""
        if not hasattr(self, 'settings_cache'):
            self.settings_cache = {}
        if telegram_id not in self.settings_cache:
            self.settings_cache[telegram_id] = await self.get_settings_by_telegram_id(telegram_id)
        return self.settings_cache[telegram_id]

    async def process_auto_delete(self, message: Message, bot_id: int) -> bool:
        """Единая точка проверки автоудаления. Возвращает True если сообщение удалено/будет удалено."""
        if not message or not message.chat:
            return False

        settings = await self.resolve_settings(message.chat.id)
        if not settings:
            return False

        should_delete = False

        if settings.delete_all_messages:
            should_delete = True
        elif is_system_message(message):
            if settings.delete_system_messages:
                should_delete = True
            elif settings.delete_join_messages and is_join_message(message):
                should_delete = True
        elif is_command_message(message):
            if settings.delete_command_messages:
                should_delete = True
        elif settings.delete_text_only and is_text_only_message(message):
            should_delete = True
        elif settings.delete_media_only and is_media_message(message):
            should_delete = True

        if not should_delete:
            return False

        delay = settings.delete_delay_seconds or 0
        from backend.celery.tasks import delayed_delete_message
        delayed_delete_message.apply_async(
            args=[bot_id, message.chat.id, message.message_id],
            countdown=delay,
        )
        return True

    async def get_settings_by_telegram_id(self, telegram_id: int) -> Optional[ChannelAutoDeleteSettings]:
        """Получить настройки по Telegram ID (включая linked_chat_id)."""
        query = (
            select(ChannelAutoDeleteSettings)
            .join(ChannelGroup)
            .where(or_(
                ChannelGroup.telegram_id == telegram_id,
                ChannelGroup.linked_chat_id == telegram_id,
            ))
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def ensure_settings(self, channel: ChannelGroup) -> ChannelAutoDeleteSettings:
        """Создать настройки автоудаления если их ещё нет."""
        if channel.auto_delete_settings:
            return channel.auto_delete_settings

        settings = ChannelAutoDeleteSettings(
            channel_id=channel.id,
            delete_system_messages=False,
            delete_command_messages=False,
        )
        self.db.add(settings)
        await self.db.flush()
        await self.db.refresh(settings)
        return settings

    async def safe_delete(self, telegram_bot: RateLimitedBot, chat_id: int, message_id: int) -> bool:
        """Безопасно удалить сообщение."""
        try:
            await telegram_bot.delete_message(chat_id=chat_id, message_id=message_id)
            return True
        except TelegramAPIError as e:
            logger.warning("safe_delete failed: chat=%s msg=%s error=%s", chat_id, message_id, e)
            return False
