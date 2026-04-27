from datetime import datetime, timezone
from typing import Optional

import aiohttp
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import BufferedInputFile, FSInputFile
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.features.telegram_settings.refresh_photo import refresh_channel_photo
from backend.services.channel.utils.query_utils import get_channel
from backend.services.telegram_client import RateLimitedBot


async def upload_photo_from_path(bot: RateLimitedBot, channel: ChannelGroup, path: str) -> None:
    """Загружает фото канала по URL или локальному пути и обновляет поля канала."""
    if path.startswith(("http://", "https://")):
        async with aiohttp.ClientSession() as session:
            async with session.get(path) as response:
                if response.status != 200:
                    return
                photo = BufferedInputFile(await response.read(), filename="photo.jpg")
                await bot.set_chat_photo(chat_id=channel.telegram_id, photo=photo)
    else:
        photo = FSInputFile(path)
        await bot.set_chat_photo(chat_id=channel.telegram_id, photo=photo)

    await refresh_channel_photo(bot, channel)


class UpdateTelegramSettings:
    """Обновляет title / description / photo канала через Telegram API."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        photo_file_path: Optional[str] = None,
    ) -> ChannelGroup:
        """Возвращает обновлённый канал. 404 если не принадлежит пользователю; 400 при ошибке Telegram."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        bot = await resolve_for_channel(self.db, channel)

        try:
            if title is not None:
                await bot.set_chat_title(chat_id=channel.telegram_id, title=title)
                channel.title = title

            if description is not None:
                await bot.set_chat_description(chat_id=channel.telegram_id, description=description)
                channel.description = description

            if photo_file_path is not None:
                await upload_photo_from_path(bot, channel, photo_file_path)
        except TelegramBadRequest as exc:
            raise HTTPException(status_code=400, detail=f"Failed to update channel settings: {exc}")

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
