from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel


class GetBotByToken:
    """Резолвит бота по telegram bot-токену из URL."""

    async def execute(self, db: AsyncSession, token: str) -> BotModel | None:
        result = await db.execute(
            select(BotModel)
            .where(BotModel.token == token)
            .order_by(BotModel.id.asc())
            .limit(1)
        )
        return result.scalar_one_or_none()
