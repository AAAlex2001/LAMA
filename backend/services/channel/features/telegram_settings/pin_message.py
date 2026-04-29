from datetime import datetime, timezone

from aiogram.exceptions import TelegramBadRequest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.utils.query_utils import get_channel


class PinChannelMessage:
    """Закрепляет сообщение в канале и сохраняет его в ``pinned_message`` канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        message_id: int,
        disable_notification: bool = False,
    ) -> ChannelGroup:
        """Возвращает обновлённый канал. 404 если не принадлежит пользователю; 400 при ошибке Telegram."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        bot = await resolve_for_channel(self.db, channel)

        try:
            await bot.pin_chat_message(
                chat_id=channel.telegram_id,
                message_id=message_id,
                disable_notification=disable_notification,
            )
            chat = await bot.get_chat(channel.telegram_id)
        except TelegramBadRequest as exc:
            raise HTTPException(status_code=400, detail=f"Failed to pin message: {exc}")

        if getattr(chat, "pinned_message", None):
            channel.pinned_message = chat.pinned_message.model_dump(mode="json")

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
