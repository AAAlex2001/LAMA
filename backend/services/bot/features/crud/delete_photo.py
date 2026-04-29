"""Удаление фото профиля бота через Telegram API."""

from datetime import datetime, timezone

from aiogram.exceptions import TelegramAPIError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot_provider import resolve_by_token


class DeleteBotPhoto:
    """delete_my_profile_photo + photo_url=None."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, owner_id: int) -> BotModel:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        telegram_bot = resolve_by_token(bot.token).bot
        try:
            await telegram_bot.delete_my_profile_photo()
        except TelegramAPIError as exc:
            raise HTTPException(status_code=400, detail=f"Failed to delete bot photo: {exc}")

        bot.photo_url = None
        bot.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(bot)
        return bot
