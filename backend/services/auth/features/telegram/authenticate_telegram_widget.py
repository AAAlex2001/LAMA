from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.auth.features.sessions.create_user_session import CreateUserSession
from backend.services.auth.features.telegram.upsert_telegram_user import UpsertTelegramUser
from backend.services.auth.features.telegram.verify_telegram_widget import VerifyTelegramWidget
from backend.services.auth.features.tokens.create_access_token import CreateAccessToken
from backend.services.auth.features.tokens.create_refresh_token import CreateRefreshToken
from backend.services.auth.settings import AuthSettings
from backend.services.auth.types import AuthResult, ClientContext, TelegramAuthData


class AuthenticateTelegramWidget:
    """Логин через Telegram Login Widget: HMAC-проверка + upsert юзера + выпуск пары токенов."""

    def __init__(self, db: AsyncSession, settings: AuthSettings):
        self.db = db
        self.settings = settings

    async def execute(
        self,
        auth_data: TelegramAuthData,
        context: ClientContext | None = None,
    ) -> AuthResult:
        VerifyTelegramWidget(self.settings).execute(auth_data)
        auth_date = datetime.fromtimestamp(auth_data.auth_date, tz=timezone.utc)
        user = await UpsertTelegramUser(self.db).execute(
            telegram_id=auth_data.id,
            username=auth_data.username,
            first_name=auth_data.first_name,
            last_name=auth_data.last_name,
            photo_url=auth_data.photo_url,
            auth_date=auth_date,
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
