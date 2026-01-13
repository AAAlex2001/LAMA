from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from aiogram import Bot
from aiogram.types import Message
from aiogram.exceptions import TelegramAPIError

from backend.models.channels import ChannelAutoDeleteSettings, ChannelGroup
from backend.schemas.channels import ChannelAutoDeleteSettingsUpdate


class ChannelAutoDeleteService:
    """
    Сервис для управления автоудалением сообщений:
    - системные сообщения (join/left и т.п.)
    - пользовательские команды (начинаются с "/")
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_settings(self, channel_id: int, owner_id: int) -> ChannelAutoDeleteSettings:
        channel = await self.get_channel_by_owner(channel_id, owner_id)
        if not channel:
            raise ValueError("Channel not found")
        return await self.ensure_settings(channel)

    async def update_settings(
        self,
        channel_id: int,
        data: ChannelAutoDeleteSettingsUpdate,
        owner_id: int,
    ) -> ChannelAutoDeleteSettings:
        channel = await self.get_channel_by_owner(channel_id, owner_id)
        if not channel:
            raise ValueError("Channel not found")

        settings = await self.ensure_settings(channel)
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(settings, field, value)

        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    async def get_settings_by_telegram_id(self, telegram_id: int) -> Optional[ChannelAutoDeleteSettings]:
        query = (
            select(ChannelAutoDeleteSettings)
            .join(ChannelGroup)
            .where(ChannelGroup.telegram_id == telegram_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def delete_if_system_message(self, telegram_bot: Bot, message: Message) -> bool:
        if not message or not message.chat:
            return False

        settings = await self.get_settings_by_telegram_id(message.chat.id)
        if not settings or not settings.delete_system_messages:
            return False

        if not self.is_system_message(message):
            return False

        return await self.safe_delete_message(telegram_bot, message.chat.id, message.message_id)

    async def delete_if_command_message(self, telegram_bot: Bot, message: Message) -> bool:
        if not message or not message.chat:
            return False

        settings = await self.get_settings_by_telegram_id(message.chat.id)
        if not settings or not settings.delete_command_messages:
            return False

        if not self.is_command_message(message):
            return False

        return await self.safe_delete_message(telegram_bot, message.chat.id, message.message_id)

    @staticmethod
    def is_system_message(message: Message) -> bool:
        """Определить, является ли сообщение системным"""
        return any([
            bool(getattr(message, "new_chat_members", None)),
            bool(getattr(message, "left_chat_member", None)),
            bool(getattr(message, "new_chat_title", None)),
            bool(getattr(message, "new_chat_photo", None)),
            bool(getattr(message, "delete_chat_photo", None)),
            bool(getattr(message, "pinned_message", None)),
            bool(getattr(message, "successful_payment", None)),
            bool(getattr(message, "proximity_alert_triggered", None)),
            bool(getattr(message, "video_chat_started", None)),
            bool(getattr(message, "video_chat_ended", None)),
            bool(getattr(message, "video_chat_participants_invited", None)),
            bool(getattr(message, "message_auto_delete_timer_changed", None)),
            bool(getattr(message, "forum_topic_created", None)),
            bool(getattr(message, "forum_topic_closed", None)),
            bool(getattr(message, "forum_topic_reopened", None)),
        ])

    @staticmethod
    def is_command_message(message: Message) -> bool:
        text = message.text or message.caption
        return bool(text and text.strip().startswith("/"))

    async def get_channel_by_owner(self, channel_id: int, owner_id: int) -> Optional[ChannelGroup]:
        query = (
            select(ChannelGroup)
            .options(selectinload(ChannelGroup.auto_delete_settings))
            .where(
                ChannelGroup.id == channel_id,
                ChannelGroup.owner_id == owner_id,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def ensure_settings(self, channel: ChannelGroup) -> ChannelAutoDeleteSettings:
        if channel.auto_delete_settings:
            return channel.auto_delete_settings

        settings = ChannelAutoDeleteSettings(
            channel_id=channel.id,
            delete_system_messages=False,
            delete_command_messages=False,
        )
        self.db.add(settings)
        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    async def safe_delete_message(self, telegram_bot: Bot, chat_id: int, message_id: int) -> bool:
        try:
            await telegram_bot.delete_message(chat_id=chat_id, message_id=message_id)
            return True
        except TelegramAPIError:
            return False
