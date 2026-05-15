from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import User, UserRole
from backend.services.auth.features.users.get_user import GetUser


class UpdateUser:
    """Обновляет `role` и/или `is_active` юзера. Не трогает email/пароль/telegram."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(
        self,
        user_id: int,
        role: UserRole | None = None,
        is_active: bool | None = None,
    ) -> User:
        user = await GetUser(self.db).execute(user_id)
        if role is not None:
            user.role = role
        if is_active is not None:
            user.is_active = is_active

        user.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(user)
        return await GetUser(self.db).execute(user.id)
