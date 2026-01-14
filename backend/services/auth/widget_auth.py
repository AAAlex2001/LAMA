"""
Авторизация через Telegram Login Widget
"""
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.auth import User, TelegramAccount, UserSession, UserRole
from backend.schemas.auth import TelegramAuthPayload


class WidgetAuthService:
    """Сервис авторизации через Telegram Login Widget"""

    def __init__(
        self,
        db: AsyncSession,
        bot_token: str,
        access_token_expire_minutes: int = 60 * 24
    ):
        self.db = db
        self.bot_token = bot_token
        self.access_token_expire_minutes = access_token_expire_minutes

    def verify_telegram_auth(self, auth_data: TelegramAuthPayload) -> bool:
        """
        Проверить подлинность данных от Telegram Login Widget
        https://core.telegram.org/widgets/login#checking-authorization
        """
        check_data = {
            "auth_date": str(auth_data.auth_date),
            "first_name": auth_data.first_name,
            "id": str(auth_data.id),
        }

        if auth_data.last_name:
            check_data["last_name"] = auth_data.last_name
        if auth_data.username:
            check_data["username"] = auth_data.username
        if auth_data.photo_url:
            check_data["photo_url"] = auth_data.photo_url

        data_check_string = "\n".join(
            [f"{k}={v}" for k, v in sorted(check_data.items())])

        secret_key = hashlib.sha256(self.bot_token.encode()).digest()
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()

        now = datetime.now(timezone.utc).timestamp()
        if now - auth_data.auth_date > 86400:
            return False

        return computed_hash == auth_data.hash

    async def authenticate_telegram_user(
        self,
        auth_data: TelegramAuthPayload,
        access_token: str,
        refresh_token: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> User:
        """
        Аутентифицировать пользователя через Telegram Widget
        Возвращает: User
        """
        if not self.verify_telegram_auth(auth_data):
            raise ValueError("Invalid Telegram authentication data")

        query = select(TelegramAccount).options(
            selectinload(TelegramAccount.user)
        ).where(TelegramAccount.telegram_id == auth_data.id)
        result = await self.db.execute(query)
        telegram_account = result.scalar_one_or_none()

        if telegram_account:
            telegram_account.username = auth_data.username
            telegram_account.first_name = auth_data.first_name
            telegram_account.last_name = auth_data.last_name
            telegram_account.photo_url = auth_data.photo_url
            telegram_account.auth_date = datetime.fromtimestamp(
                auth_data.auth_date, tz=timezone.utc)
            telegram_account.updated_at = datetime.now(timezone.utc)

            user = telegram_account.user
        else:
            user = User(
                role=UserRole.USER,
                is_active=True
            )
            self.db.add(user)
            await self.db.flush()

            telegram_account = TelegramAccount(
                user_id=user.id,
                telegram_id=auth_data.id,
                username=auth_data.username,
                first_name=auth_data.first_name,
                last_name=auth_data.last_name,
                photo_url=auth_data.photo_url,
                auth_date=datetime.fromtimestamp(
                    auth_data.auth_date, tz=timezone.utc)
            )
            self.db.add(telegram_account)

        expires_at = datetime.now(
            timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        session = UserSession(
            user_id=user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            is_active=True,
            user_agent=user_agent,
            ip_address=ip_address
        )
        self.db.add(session)

        await self.db.commit()

        user_query = select(User).options(
            selectinload(User.telegram_account)
        ).where(User.id == user.id)
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one()

        return user
