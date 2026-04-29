from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import TelegramAccount


class GetUserTelegramId:
    """Возвращает Telegram ID привязанного аккаунта пользователя."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, owner_id: int) -> int:
        """Бросает 400 если у пользователя нет привязанного Telegram-аккаунта."""
        telegram_id = (await self.db.execute(
            select(TelegramAccount.telegram_id).where(TelegramAccount.user_id == owner_id)
        )).scalar_one_or_none()
        if not telegram_id:
            raise HTTPException(status_code=400, detail="User has no linked Telegram account")
        return telegram_id
