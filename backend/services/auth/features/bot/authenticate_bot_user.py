from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.auth.features.sessions.create_user_session import CreateUserSession
from backend.services.auth.features.telegram.upsert_telegram_user import UpsertTelegramUser
from backend.services.auth.features.tokens.create_access_token import CreateAccessToken
from backend.services.auth.features.tokens.create_refresh_token import CreateRefreshToken
from backend.services.auth.settings import AuthSettings
from backend.services.auth.types import AuthResult, ClientContext


class AuthenticateBotUser:
    """Bot-side логин: бот даёт `telegram_id`, мы делаем upsert юзера и выпускаем токены."""

    def __init__(self, db: AsyncSession, settings: AuthSettings):
        self.db = db
        self.settings = settings

    async def execute(
        self,
        telegram_id: int,
        username: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        photo_url: str | None = None,
        context: ClientContext | None = None,
    ) -> AuthResult:
        user = await UpsertTelegramUser(self.db).execute(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            photo_url=photo_url,
        )
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated")

        access_token = CreateAccessToken(self.settings).execute(user.id)
        refresh_token = CreateRefreshToken(self.settings).execute(user.id)
        await CreateUserSession(self.db, self.settings).execute(
            user.id,
            access_token,
            refresh_token,
            context,
        )

        return AuthResult(
            user=user,
            access_token=access_token,
            refresh_token=refresh_token,
        )
