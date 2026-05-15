from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.auth import User, UserRole


class ListUsers:
    """Пагинированный список юзеров с фильтрами по role / is_active."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(
        self,
        role: UserRole | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[User], int]:
        query = select(User).options(selectinload(User.telegram_account))
        if role:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)

        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar() or 0

        users_result = await self.db.execute(
            query.order_by(desc(User.created_at)).offset(skip).limit(limit)
        )
        return list(users_result.scalars().all()), total
