from typing import Optional

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import Message
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelAutoDeleteSettings, ChannelGroup
from backend.schemas.channels import ChannelAutoDeleteSettingsUpdate
from backend.services.channel.utils.message_utils import is_command_message, is_system_message
from backend.services.channel.utils.query_utils import get_channel


class AutoDeleteService:
    """Управление автоудалением сообщений."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_settings(self, channel_id: int, owner_id: int) -> ChannelAutoDeleteSettings:
        """Получить настройки автоудаления."""
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

    async def delete_if_system(self, telegram_bot: Bot, message: Message) -> bool:
        """Удалить системное сообщение если настроено."""
        if not message or not message.chat:
            return False

        settings = await self.get_settings_by_telegram_id(message.chat.id)
        if not settings or not settings.delete_system_messages:
            return False

        if not is_system_message(message):
            return False

        return await self.safe_delete(telegram_bot, message.chat.id, message.message_id)

    async def delete_if_command(self, telegram_bot: Bot, message: Message) -> bool:
        """Удалить командное сообщение если настроено."""
        if not message or not message.chat:
            return False

        settings = await self.get_settings_by_telegram_id(message.chat.id)
        if not settings or not settings.delete_command_messages:
            return False

        if not is_command_message(message):
            return False

        return await self.safe_delete(telegram_bot, message.chat.id, message.message_id)

    async def get_settings_by_telegram_id(self, telegram_id: int) -> Optional[ChannelAutoDeleteSettings]:
        """Получить настройки по Telegram ID."""
        query = (
            select(ChannelAutoDeleteSettings)
            .join(ChannelGroup)
            .where(ChannelGroup.telegram_id == telegram_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def ensure_settings(self, channel: ChannelGroup) -> ChannelAutoDeleteSettings:
        """Создать настройки если не существуют."""
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

    async def safe_delete(self, telegram_bot: Bot, chat_id: int, message_id: int) -> bool:
        """Безопасно удалить сообщение."""
        try:
            await telegram_bot.delete_message(chat_id=chat_id, message_id=message_id)
            return True
        except TelegramAPIError:
            return False
