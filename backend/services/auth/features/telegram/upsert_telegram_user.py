from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.auth import TelegramAccount, User, UserRole
from backend.services.auth.features.users.get_user import GetUser


class UpsertTelegramUser:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(
        self,
        telegram_id: int,
        username: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        photo_url: str | None = None,
        auth_date: datetime | None = None,
    ) -> User:
        account_query = (
            select(TelegramAccount)
            .options(selectinload(TelegramAccount.user))
            .where(TelegramAccount.telegram_id == telegram_id)
        )
        account_result = await self.db.execute(account_query)
        telegram_account = account_result.scalar_one_or_none()
        auth_datetime = auth_date or datetime.now(timezone.utc)

        if telegram_account:
            telegram_account.username = username
            telegram_account.first_name = first_name
            telegram_account.last_name = last_name
            telegram_account.photo_url = photo_url
            telegram_account.auth_date = auth_datetime
            telegram_account.updated_at = datetime.now(timezone.utc)
            user = telegram_account.user
        else:
            user = User(role=UserRole.USER, is_active=True)
            self.db.add(user)
            await self.db.flush()

            self.db.add(
                TelegramAccount(
                    user_id=user.id,
                    telegram_id=telegram_id,
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    photo_url=photo_url,
                    auth_date=auth_datetime,
                )
            )

        await self.db.flush()
        return await GetUser(self.db).execute(user.id)
