from datetime import datetime, timezone

from aiogram.exceptions import TelegramBadRequest
from aiogram.types import BufferedInputFile
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.features.telegram_settings.refresh_photo import refresh_channel_photo
from backend.services.channel.utils.query_utils import get_channel


class UploadChannelPhotoBytes:
    """Загружает фото канала из байтов (multipart upload)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        data: bytes,
        filename: str,
    ) -> ChannelGroup:
        """Возвращает обновлённый канал. 404 если не принадлежит пользователю; 400 при ошибке Telegram."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        bot = await resolve_for_channel(self.db, channel)

        try:
            photo = BufferedInputFile(data, filename=filename)
            await bot.set_chat_photo(chat_id=channel.telegram_id, photo=photo)
            await refresh_channel_photo(bot, channel)
        except TelegramBadRequest as exc:
            raise HTTPException(status_code=400, detail=f"Failed to upload photo: {exc}")

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
