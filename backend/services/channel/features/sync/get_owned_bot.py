from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel


class GetOwnedBot:
    """Достаёт бота, принадлежащего пользователю."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, owner_id: int) -> BotModel:
        """Бросает 404 если бот не найден или принадлежит другому пользователю."""
        bot = (await self.db.execute(
            select(BotModel).where(BotModel.id == bot_id, BotModel.owner_id == owner_id)
        )).scalar_one_or_none()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found or does not belong to user")
        return bot
