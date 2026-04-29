"""Обновление настроек welcome-сообщения бота."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.schemas.bots.welcome import WelcomeSettingsUpdate
from backend.services.bot.features.crud.lookup import find_bot_or_404


class UpdateWelcomeSettings:
    """Обновляет welcome_*-поля бота из exclude_unset."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, bot_id: int, data: WelcomeSettingsUpdate, owner_id: Optional[int] = None,
    ) -> BotModel:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        for field, value in data.model_dump(exclude_unset=True).items():
            if hasattr(bot, field):
                setattr(bot, field, value)

        bot.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(bot)
        return bot
