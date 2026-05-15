from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.auth import User


class GetUser:
    """Возвращает юзера по id с подгруженным `telegram_account`. 404 если нет."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, user_id: int) -> User:
        query = (
            select(User)
            .options(selectinload(User.telegram_account))
            .where(User.id == user_id)
        )
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
