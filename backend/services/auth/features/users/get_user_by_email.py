from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.auth import User


class GetUserByEmail:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, email: str) -> User | None:
        query = (
            select(User)
            .options(selectinload(User.telegram_account))
            .where(User.email == email.lower())
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
