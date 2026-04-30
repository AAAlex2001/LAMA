from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotStatus
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.webhook.features.settings.set_webhook import SetWebhook


class ActivateBot:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, owner_id: int) -> BotModel:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        bot.status = BotStatus.ACTIVE
        bot.is_webhook_enabled = True
        bot.webhook_url = await SetWebhook().execute(bot.token)
        bot.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(bot)
        return bot
