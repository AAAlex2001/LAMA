"""
CRUD операции для пользователей
"""
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import User, TelegramAccount, UserRole
from backend.schemas.auth import UserUpdateRequest


class UserCRUDService:
    """Сервис для CRUD операций с пользователями"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user(self, user_id: int) -> Optional[User]:
        """Получить пользователя по ID"""
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_by_telegram_id(self, telegram_id: int) -> Optional[User]:
        """Получить пользователя по Telegram ID"""
        query = select(User).join(TelegramAccount).where(
            TelegramAccount.telegram_id == telegram_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_users(
        self,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[User], int]:
        """Получить список пользователей с фильтрацией"""
        query = select(User)

        if role:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(desc(User.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(query)
        users = list(result.scalars().all())

        return users, total

    async def update_user(self, user_id: int, data: UserUpdateRequest) -> Optional[User]:
        """Обновить пользователя (только для админа)"""
        user = await self.get_user(user_id)
        if not user:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        user.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def delete_user(self, user_id: int) -> bool:
        """Удалить пользователя"""
        user = await self.get_user(user_id)
        if not user:
            return False

        await self.db.delete(user)
        await self.db.commit()
        return True
