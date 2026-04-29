"""Обновление полей бота с синхронизацией name/description в Telegram."""

from datetime import datetime, timezone

from aiogram.exceptions import TelegramAPIError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.schemas.bots import BotUpdate
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.crud.sync_telegram_fields import (
    needs_telegram_sync,
    sync_telegram_fields,
)
from backend.services.bot_provider import resolve_by_token


class UpdateBot:
    """Обновляет переданные поля; name/description дополнительно шлёт в TG."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, data: BotUpdate, owner_id: int) -> BotModel:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        update_data = data.model_dump(exclude_unset=True)
        new_name = update_data.pop("name", None)

        try:
            if needs_telegram_sync(new_name, update_data):
                telegram_bot = resolve_by_token(bot.token).bot
                await sync_telegram_fields(telegram_bot, bot, new_name, update_data)

            for field, value in update_data.items():
                setattr(bot, field, value)

            bot.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(bot)
            return bot
        except TelegramAPIError as exc:
            raise HTTPException(
                status_code=400, detail=f"Failed to update bot in Telegram: {exc}",
            )
