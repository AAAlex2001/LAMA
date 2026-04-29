"""Получить актуальные данные бота из Telegram и сохранить (create-or-update)."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotStatus
from backend.services.bot.features.crud.lookup import get_bot_by_telegram_id
from backend.services.bot.features.crud.tg_info import fetch_bot_info
from backend.services.bot.features.crud.webhook_helpers import (
    build_webhook_url,
    setup_webhook,
)
from backend.services.bot_provider import resolve_by_token


class SyncBotFromTelegram:
    """Если бот уже есть у пользователя — обновляет; иначе создаёт. Ставит вебхук."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, token: str, owner_id: int, description: Optional[str] = None,
    ) -> BotModel:
        bot_info, tg_description, short_description = await fetch_bot_info(token)
        final_description = description if description else tg_description

        existing = await get_bot_by_telegram_id(self.db, bot_info.id, owner_id=owner_id)
        if existing:
            update_existing(existing, bot_info, token, final_description, short_description)
            bot = existing
        else:
            await self.guard_other_user_owns(bot_info.id)
            if owner_id is None:
                raise HTTPException(
                    status_code=400, detail="Owner id is required to register a new bot",
                )
            bot = build_new_bot(owner_id, bot_info, token, final_description, short_description)
            self.db.add(bot)

        await self.db.flush()
        await self.db.refresh(bot)

        raw_bot = resolve_by_token(token).bot
        await setup_webhook(raw_bot, token)
        bot.is_webhook_enabled = True
        bot.webhook_url = build_webhook_url(token)
        await self.db.flush()
        await self.db.refresh(bot)

        return bot

    async def guard_other_user_owns(self, telegram_id: int) -> None:
        """409 если бот с таким telegram_id уже зарегистрирован другим пользователем."""
        if await get_bot_by_telegram_id(self.db, telegram_id):
            raise HTTPException(
                status_code=409, detail="This bot is already registered by another user",
            )


def update_existing(
    bot: BotModel,
    bot_info,
    token: str,
    description: Optional[str],
    short_description: Optional[str],
) -> None:
    """Обновляет имеющуюся модель свежими данными из TG."""
    bot.username = bot_info.username or ""
    bot.first_name = bot_info.first_name
    bot.token = token
    if description is not None:
        bot.description = description or ""
    if short_description is not None:
        bot.short_description = short_description
    if not bot.welcome_type:
        bot.welcome_type = "group_message"
    now = datetime.now(timezone.utc)
    bot.last_sync_at = now
    bot.updated_at = now


def build_new_bot(
    owner_id: int,
    bot_info,
    token: str,
    description: Optional[str],
    short_description: Optional[str],
) -> BotModel:
    """Свежий BotModel со status=ACTIVE."""
    return BotModel(
        owner_id=owner_id,
        telegram_id=bot_info.id,
        username=bot_info.username,
        first_name=bot_info.first_name,
        token=token,
        description=description,
        short_description=short_description,
        welcome_type="group_message",
        status=BotStatus.ACTIVE,
        last_sync_at=datetime.now(timezone.utc),
    )
