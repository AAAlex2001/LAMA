"""Создание AutoReply."""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import AutoReply
from backend.services.bot.features.crud.lookup import find_bot_or_404


class CreateAutoReply:
    """Создаёт автоответ; 404 если бот не принадлежит пользователю."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        data,
        owner_id: Optional[int] = None,
        channel_id: Optional[int] = None,
    ) -> AutoReply:
        await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        auto_reply = AutoReply(
            bot_id=bot_id,
            channel_id=channel_id,
            keywords=data.keywords,
            response_text=data.response_text,
            response_media_url=data.response_media_url,
            response_media_urls=data.response_media_urls,
            response_media_type=data.response_media_type,
            response_buttons=data.response_buttons,
            scope=data.scope,
            is_active=data.is_active,
            frequency_limit_minutes=data.frequency_limit_minutes,
            frequency_limit_type=data.frequency_limit_type,
        )
        self.db.add(auto_reply)
        await self.db.flush()
        await self.db.refresh(auto_reply)
        return auto_reply
