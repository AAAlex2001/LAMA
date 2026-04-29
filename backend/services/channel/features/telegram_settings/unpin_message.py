from datetime import datetime, timezone
from typing import Optional

from aiogram.exceptions import TelegramBadRequest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.utils.query_utils import get_channel


class UnpinChannelMessage:
    """Открепляет конкретное сообщение или все сообщения канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        message_id: Optional[int] = None,
    ) -> ChannelGroup:
        """``message_id=None`` — открепить все. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        bot = await resolve_for_channel(self.db, channel)

        try:
            if message_id is None:
                await bot.unpin_all_chat_messages(chat_id=channel.telegram_id)
                channel.pinned_message = None
            else:
                await bot.unpin_chat_message(chat_id=channel.telegram_id, message_id=message_id)
                chat = await bot.get_chat(channel.telegram_id)
                channel.pinned_message = (
                    chat.pinned_message.model_dump(mode="json")
                    if getattr(chat, "pinned_message", None)
                    else None
                )
        except TelegramBadRequest as exc:
            raise HTTPException(status_code=400, detail=f"Failed to unpin message: {exc}")

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
