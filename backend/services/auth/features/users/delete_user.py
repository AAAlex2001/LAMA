from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.auth.features.users.get_user import GetUser


class DeleteUser:
    """Физически удаляет юзера. Каскадом удаляет telegram_account, sessions, ботов, каналы."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, user_id: int) -> None:
        user = await GetUser(self.db).execute(user_id)
        await self.db.delete(user)
        await self.db.flush()
