from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotStatus
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.webhook.features.settings.delete_webhook import DeleteWebhook


class DeactivateBot:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, owner_id: int) -> BotModel:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        await DeleteWebhook().execute(bot.token)
        bot.status = BotStatus.INACTIVE
        bot.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(bot)
        return bot
