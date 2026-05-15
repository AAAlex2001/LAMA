from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import BotLoginCode
from backend.services.auth.features.sessions.create_user_session import CreateUserSession
from backend.services.auth.features.telegram.upsert_telegram_user import UpsertTelegramUser
from backend.services.auth.features.tokens.create_access_token import CreateAccessToken
from backend.services.auth.features.tokens.create_refresh_token import CreateRefreshToken
from backend.services.auth.settings import AuthSettings
from backend.services.auth.types import AuthResult, ClientContext


class RedeemBotLoginCode:
    """Обменивает одноразовый код от бота на access+refresh пару."""

    def __init__(self, db: AsyncSession, settings: AuthSettings):
        self.db = db
        self.settings = settings

    async def execute(
        self,
        code: str,
        context: ClientContext | None = None,
    ) -> AuthResult:
        query = select(BotLoginCode).where(
            BotLoginCode.code == code,
            BotLoginCode.is_used.is_(False),
        )
        result = await self.db.execute(query)
        login_code = result.scalar_one_or_none()
        if not login_code:
            raise HTTPException(status_code=401, detail="Invalid or expired login code")
        if datetime.now(timezone.utc) > login_code.expires_at:
            raise HTTPException(status_code=401, detail="Login code has expired")

        user = await UpsertTelegramUser(self.db).execute(
            telegram_id=login_code.telegram_id,
            username=login_code.username,
            first_name=login_code.first_name,
            last_name=login_code.last_name,
            photo_url=login_code.photo_url,
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

        login_code.is_used = True
        login_code.used_at = datetime.now(timezone.utc)
        await self.db.flush()

        return AuthResult(
            user=user,
            access_token=access_token,
            refresh_token=refresh_token,
        )
