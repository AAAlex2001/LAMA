from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.auth import TelegramAccount, User


class GetUserByTelegramId:
    """Возвращает юзера по `TelegramAccount.telegram_id` или None."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, telegram_id: int) -> User | None:
        query = (
            select(User)
            .join(TelegramAccount)
            .options(selectinload(User.telegram_account))
            .where(TelegramAccount.telegram_id == telegram_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
