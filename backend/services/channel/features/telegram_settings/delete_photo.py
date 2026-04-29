from datetime import datetime, timezone

from aiogram.exceptions import TelegramBadRequest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.utils.query_utils import get_channel


class DeleteChannelPhoto:
    """Удаляет фото канала в Telegram и обнуляет соответствующие поля в БД."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, owner_id: int) -> ChannelGroup:
        """Возвращает обновлённый канал. 404 если не принадлежит пользователю; 400 при ошибке Telegram."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        bot = await resolve_for_channel(self.db, channel)

        try:
            await bot.delete_chat_photo(chat_id=channel.telegram_id)
        except TelegramBadRequest as exc:
            raise HTTPException(status_code=400, detail=f"Failed to delete channel photo: {exc}")

        channel.photo_url = None
        channel.photo_small_file_id = None
        channel.photo_small_file_unique_id = None
        channel.photo_big_file_id = None
        channel.photo_big_file_unique_id = None
        channel.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(channel)
        return channel
