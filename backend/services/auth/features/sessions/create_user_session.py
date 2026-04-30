from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import UserSession
from backend.services.auth.settings import AuthSettings
from backend.services.auth.types import ClientContext


class CreateUserSession:
    def __init__(self, db: AsyncSession, settings: AuthSettings):
        self.db = db
        self.settings = settings

    async def execute(
        self,
        user_id: int,
        access_token: str,
        refresh_token: str,
        context: ClientContext | None = None,
    ) -> UserSession:
        now = datetime.now(timezone.utc)
        client = context or ClientContext()
        session = UserSession(
            user_id=user_id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=now + timedelta(minutes=self.settings.access_token_expire_minutes),
            is_active=True,
            user_agent=client.user_agent,
            ip_address=client.ip_address,
        )
        self.db.add(session)
        await self.db.flush()
        return session
