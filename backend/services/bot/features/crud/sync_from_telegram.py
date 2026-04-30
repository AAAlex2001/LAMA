from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotStatus
from backend.services.bot.features.crud.lookup import get_bot_by_telegram_id
from backend.services.bot.features.crud.tg_info_helpers import fetch_bot_info
from backend.services.webhook.features.settings.set_webhook import SetWebhook


class SyncBotFromTelegram:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        token: str,
        owner_id: int,
        description: Optional[str] = None,
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
                    status_code=400,
                    detail="Owner id is required to register a new bot",
                )
            bot = build_new_bot(
                owner_id,
                bot_info,
                token,
                final_description,
                short_description,
            )
            self.db.add(bot)

        await self.db.flush()
        await self.db.refresh(bot)

        bot.is_webhook_enabled = True
        bot.webhook_url = await SetWebhook().execute(token)
        await self.db.flush()
        await self.db.refresh(bot)
        return bot

    async def guard_other_user_owns(self, telegram_id: int) -> None:
        if await get_bot_by_telegram_id(self.db, telegram_id):
            raise HTTPException(
                status_code=409,
                detail="This bot is already registered by another user",
            )


def update_existing(
    bot: BotModel,
    bot_info,
    token: str,
    description: Optional[str],
    short_description: Optional[str],
) -> None:
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
