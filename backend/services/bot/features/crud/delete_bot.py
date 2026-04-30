from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.webhook.features.settings.delete_webhook import DeleteWebhook


class DeleteBot:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, owner_id: int) -> None:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        await DeleteWebhook().execute(bot.token)
        await self.db.delete(bot)
        await self.db.flush()
