"""
Авторизация через Telegram бота
"""
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.auth import User, TelegramAccount, UserSession, UserRole, BotLoginCode


class BotAuthService:
    """Сервис авторизации через бота"""

    def __init__(
        self,
        db: AsyncSession,
        access_token_expire_minutes: int = 60 * 24
    ):
        self.db = db
        self.access_token_expire_minutes = access_token_expire_minutes

    async def get_or_create_user_by_telegram_id(
        self,
        telegram_id: int,
        username: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        photo_url: Optional[str] = None
    ) -> User:
        """Получить или создать пользователя по telegram_id"""
        query = select(TelegramAccount).options(
            selectinload(TelegramAccount.user)
        ).where(TelegramAccount.telegram_id == telegram_id)
        result = await self.db.execute(query)
        telegram_account = result.scalar_one_or_none()

        if telegram_account:
            # Обновляем данные пользователя
            telegram_account.username = username
            telegram_account.first_name = first_name
            telegram_account.last_name = last_name
            telegram_account.photo_url = photo_url
            telegram_account.auth_date = datetime.now(timezone.utc)
            telegram_account.updated_at = datetime.now(timezone.utc)

            user = telegram_account.user
        else:
            # Создаём нового пользователя
            user = User(
                role=UserRole.USER,
                is_active=True
            )
            self.db.add(user)
            await self.db.flush()

            telegram_account = TelegramAccount(
                user_id=user.id,
                telegram_id=telegram_id,
                username=username,
                first_name=first_name,
                last_name=last_name,
                photo_url=photo_url,
                auth_date=datetime.now(timezone.utc)
            )
            self.db.add(telegram_account)
            await self.db.flush()

        # Загружаем User с telegram_account для Pydantic
        user_query = select(User).options(
            selectinload(User.telegram_account)
        ).where(User.id == user.id)
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one()

        await self.db.commit()

        return user

    async def create_direct_session(
        self,
        user: User,
        access_token: str,
        refresh_token: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> None:
        """Создать сессию для прямой авторизации"""
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

    async def create_bot_login_code(
        self,
        telegram_id: int,
        username: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        photo_url: Optional[str] = None,
        expires_minutes: int = 5
    ) -> BotLoginCode:
        """Создать временный код для авторизации через бота"""
        code = secrets.token_urlsafe(16)
        expires_at = datetime.now(timezone.utc) + \
                                  timedelta(minutes=expires_minutes)

        login_code = BotLoginCode(
            code=code,
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            photo_url=photo_url,
            is_used=False,
            expires_at=expires_at
        )

        self.db.add(login_code)
        await self.db.commit()
        await self.db.refresh(login_code)

        return login_code

    async def get_or_create_user_from_code(self, code: str) -> User:
        """Получить или создать пользователя по коду авторизации"""
        query = select(BotLoginCode).where(
            BotLoginCode.code == code,
            BotLoginCode.is_used == False
        )
        result = await self.db.execute(query)
        login_code = result.scalar_one_or_none()

        if not login_code:
            raise ValueError("Invalid or expired login code")

        if datetime.now(timezone.utc) > login_code.expires_at:
            raise ValueError("Login code has expired")

        account_query = select(TelegramAccount).options(
            selectinload(TelegramAccount.user)
        ).where(TelegramAccount.telegram_id == login_code.telegram_id)
        account_result = await self.db.execute(account_query)
        telegram_account = account_result.scalar_one_or_none()

        if telegram_account:
            telegram_account.username = login_code.username
            telegram_account.first_name = login_code.first_name
            telegram_account.last_name = login_code.last_name
            telegram_account.photo_url = login_code.photo_url
            telegram_account.auth_date = datetime.now(timezone.utc)
            telegram_account.updated_at = datetime.now(timezone.utc)

            user = await self.db.get(User, telegram_account.user_id)
            if not user:
                raise ValueError("User not found")
        else:
            user = User(
                role=UserRole.USER,
                is_active=True
            )
            self.db.add(user)
            await self.db.flush()

            telegram_account = TelegramAccount(
                user_id=user.id,
                telegram_id=login_code.telegram_id,
                username=login_code.username,
                first_name=login_code.first_name,
                last_name=login_code.last_name,
                photo_url=login_code.photo_url,
                auth_date=datetime.now(timezone.utc)
            )
            self.db.add(telegram_account)
            await self.db.flush()

        # Загружаем User с telegram_account для Pydantic
        user_query = select(User).options(
            selectinload(User.telegram_account)
        ).where(User.id == user.id)
        user_result = await self.db.execute(user_query)
        user_final = user_result.scalar_one()

        return user_final

    async def create_session_from_code(
        self,
        code: str,
        user: User,
        access_token: str,
        refresh_token: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> None:
        """Создать сессию и пометить код как использованный"""
        query = select(BotLoginCode).where(
            BotLoginCode.code == code,
            BotLoginCode.is_used == False
        )
        result = await self.db.execute(query)
        login_code = result.scalar_one_or_none()

        if not login_code:
            raise ValueError("Invalid or expired login code")

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

        login_code.is_used = True
        login_code.used_at = datetime.now(timezone.utc)

        await self.db.commit()
