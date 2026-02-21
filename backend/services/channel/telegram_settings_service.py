from datetime import datetime, timezone
from typing import Any, Dict, Optional

import aiohttp
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import BufferedInputFile, ChatPermissions, FSInputFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.channel.utils.bot_utils import get_master_bot
from backend.services.channel.utils.query_utils import get_channel


class TelegramSettingsService:
    """Управление настройками канала через Telegram API."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_settings(
        self,
        channel_id: int,
        owner_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        photo_file_path: Optional[str] = None,
    ) -> ChannelGroup:
        """Обновить настройки канала через Telegram API."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise ValueError("Channel not found")

        bot = get_master_bot()

        try:
            if title is not None:
                await bot.set_chat_title(chat_id=channel.telegram_id, title=title)
                channel.title = title

            if description is not None:
                await bot.set_chat_description(chat_id=channel.telegram_id, description=description)
                channel.description = description

            if photo_file_path is not None:
                await self.upload_photo(bot, channel, photo_file_path)

            channel.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(channel)
            return channel

        except TelegramBadRequest as e:
            raise ValueError(f"Failed to update channel settings: {str(e)}")

    async def delete_photo(self, channel_id: int, owner_id: int) -> ChannelGroup:
        """Удалить фото канала."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise ValueError("Channel not found")

        bot = get_master_bot()

        try:
            await bot.delete_chat_photo(chat_id=channel.telegram_id)

            channel.photo_url = None
            channel.photo_small_file_id = None
            channel.photo_small_file_unique_id = None
            channel.photo_big_file_id = None
            channel.photo_big_file_unique_id = None
            channel.updated_at = datetime.now(timezone.utc)

            await self.db.commit()
            await self.db.refresh(channel)
            return channel

        except TelegramBadRequest as e:
            raise ValueError(f"Failed to delete channel photo: {str(e)}")

    async def set_permissions(
        self,
        channel_id: int,
        owner_id: int,
        permissions: Dict[str, bool],
        night_mode_settings: Optional[Dict[str, Any]] = None,
    ) -> ChannelGroup:
        """Установить разрешения канала."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise ValueError("Channel not found")

        bot = get_master_bot()

        try:
            if permissions:
                chat_permissions = ChatPermissions(**permissions)
                await bot.set_chat_permissions(chat_id=channel.telegram_id, permissions=chat_permissions)
                channel.permissions = permissions

            if night_mode_settings:
                self.apply_night_mode(channel, night_mode_settings)

            channel.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(channel)
            return channel

        except TelegramBadRequest as e:
            raise ValueError(f"Failed to set channel permissions: {str(e)}")

    async def pin_message(
        self,
        channel_id: int,
        owner_id: int,
        message_id: int,
        disable_notification: bool = False,
    ) -> ChannelGroup:
        """Закрепить сообщение."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise ValueError("Channel not found")

        bot = get_master_bot()

        try:
            await bot.pin_chat_message(
                chat_id=channel.telegram_id,
                message_id=message_id,
                disable_notification=disable_notification,
            )

            chat = await bot.get_chat(channel.telegram_id)
            if hasattr(chat, "pinned_message") and chat.pinned_message:
                channel.pinned_message = chat.pinned_message.model_dump(mode="json")

            channel.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(channel)
            return channel

        except TelegramBadRequest as e:
            raise ValueError(f"Failed to pin message: {str(e)}")

    async def unpin_message(
        self,
        channel_id: int,
        owner_id: int,
        message_id: Optional[int] = None,
    ) -> ChannelGroup:
        """Открепить сообщение."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise ValueError("Channel not found")

        bot = get_master_bot()

        try:
            if message_id is None:
                await bot.unpin_all_chat_messages(chat_id=channel.telegram_id)
                channel.pinned_message = None
            else:
                await bot.unpin_chat_message(chat_id=channel.telegram_id, message_id=message_id)
                chat = await bot.get_chat(channel.telegram_id)
                if hasattr(chat, "pinned_message") and chat.pinned_message:
                    channel.pinned_message = chat.pinned_message.model_dump(mode="json")
                else:
                    channel.pinned_message = None

            channel.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(channel)
            return channel

        except TelegramBadRequest as e:
            raise ValueError(f"Failed to unpin message: {str(e)}")

    async def upload_photo(self, bot, channel: ChannelGroup, photo_file_path: str):
        """Загрузить фото канала."""
        if photo_file_path.startswith(("http://", "https://")):
            async with aiohttp.ClientSession() as session:
                async with session.get(photo_file_path) as resp:
                    if resp.status == 200:
                        file_data = await resp.read()
                        photo = BufferedInputFile(file_data, filename="photo.jpg")
                        await bot.set_chat_photo(chat_id=channel.telegram_id, photo=photo)
        else:
            photo = FSInputFile(photo_file_path)
            await bot.set_chat_photo(chat_id=channel.telegram_id, photo=photo)

        chat = await bot.get_chat(channel.telegram_id)
        if chat.photo:
            try:
                photo_file = await bot.get_file(chat.photo.big_file_id)
                channel.photo_url = f"https://api.telegram.org/file/bot{bot.token}/{photo_file.file_path}"
                channel.photo_small_file_id = chat.photo.small_file_id
                channel.photo_small_file_unique_id = chat.photo.small_file_unique_id
                channel.photo_big_file_id = chat.photo.big_file_id
                channel.photo_big_file_unique_id = chat.photo.big_file_unique_id
            except Exception:
                pass

    def apply_night_mode(self, channel: ChannelGroup, settings: Dict[str, Any]):
        """Применить настройки ночного режима."""
        field_map = {
            "night_mode_enabled": bool,
            "night_mode_start": str,
            "night_mode_end": str,
            "night_mode_block_media": bool,
            "night_mode_block_text": bool,
        }
        for field, cast in field_map.items():
            if field in settings:
                setattr(channel, field, cast(settings[field]))
