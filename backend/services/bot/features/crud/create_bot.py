"""Регистрация нового бота: проверка токена, дедуп, установка webhook."""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotStatus
from backend.schemas.bots.bot import BotCreate
from backend.services.bot.features.crud.lookup import get_bot_by_telegram_id
from backend.services.bot.features.crud.tg_info_helpers import fetch_bot_info
from backend.services.webhook.features.settings.set_webhook import SetWebhook


class CreateBot:
    """Регистрирует бота по токену: достаёт инфо из TG, проверяет дубль, ставит webhook."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, data: BotCreate, owner_id: int) -> BotModel:
        """400 если бот уже у этого юзера; 409 если этот бот зарегистрирован другим."""
        bot_info, description, short_description = await fetch_bot_info(data.token)
        await self.guard_duplicates(bot_info.id, owner_id)

        bot = BotModel(
            owner_id=owner_id,
            telegram_id=bot_info.id,
            username=bot_info.username,
            first_name=bot_info.first_name,
            token=data.token,
            description=description or data.description,
            short_description=short_description,
            welcome_type="group_message",
            status=BotStatus.ACTIVE,
            last_sync_at=datetime.now(timezone.utc),
        )
        self.db.add(bot)
        await self.db.flush()
        await self.db.refresh(bot)

        bot.is_webhook_enabled = True
        bot.webhook_url = await SetWebhook().execute(data.token)
        await self.db.flush()
        await self.db.refresh(bot)
        return bot

    async def guard_duplicates(self, telegram_id: int, owner_id: int) -> None:
        """Проверка дублирования: 400 если уже свой, 409 если уже чужой."""
        if await get_bot_by_telegram_id(self.db, telegram_id, owner_id=owner_id):
            raise HTTPException(status_code=400, detail="You have already registered this bot")
        if await get_bot_by_telegram_id(self.db, telegram_id):
            raise HTTPException(status_code=409, detail="This bot is already registered by another user")
