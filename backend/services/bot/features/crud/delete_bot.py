"""Удаление бота: снятие вебхука → eviction из кешей → DELETE из БД."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.crud.webhook_helpers import (
    evict_from_cache,
    remove_webhook,
)


class DeleteBot:
    """Хард-delete бота из БД с очисткой TG-вебхука и кешей."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, owner_id: int) -> None:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        await remove_webhook(bot.token)
        await evict_from_cache(bot.token)

        await self.db.delete(bot)
        await self.db.flush()
