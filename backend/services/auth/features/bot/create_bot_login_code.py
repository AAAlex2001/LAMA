import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import BotLoginCode


class CreateBotLoginCode:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(
        self,
        telegram_id: int,
        username: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        photo_url: str | None = None,
        expires_minutes: int = 5,
    ) -> BotLoginCode:
        login_code = BotLoginCode(
            code=secrets.token_urlsafe(16),
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            photo_url=photo_url,
            is_used=False,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=expires_minutes),
        )
        self.db.add(login_code)
        await self.db.flush()
        await self.db.refresh(login_code)
        return login_code
