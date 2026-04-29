"""Активация бота: вебхук + статус ACTIVE."""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotStatus
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.crud.webhook_helpers import (
    build_webhook_url,
    setup_webhook,
)
from backend.services.bot_provider import resolve_by_token


class ActivateBot:
    """Ставит вебхук, status=ACTIVE, is_webhook_enabled=True."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, owner_id: int) -> BotModel:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        raw_bot = resolve_by_token(bot.token).bot
        await setup_webhook(raw_bot, bot.token)

        bot.status = BotStatus.ACTIVE
        bot.is_webhook_enabled = True
        bot.webhook_url = build_webhook_url(bot.token)
        bot.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(bot)
        return bot
