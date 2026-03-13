"""
Сервис авторизации по Email/Password
"""
from typing import Optional, Tuple
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
import bcrypt

from backend.models.auth import User, UserSession


class EmailAuthService:
    """Сервис для работы с email авторизацией"""

    def __init__(self, db: AsyncSession, access_token_expire_minutes: int = 60 * 24):
        self.db = db
        self.access_token_expire_minutes = access_token_expire_minutes

    @staticmethod
    def hash_password(password: str) -> str:
        """Хешировать пароль"""
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Проверить пароль"""
        try:
            password_bytes = password.encode('utf-8')
            hash_bytes = password_hash.encode('utf-8')
            return bcrypt.checkpw(password_bytes, hash_bytes)
        except Exception:
            return False

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Получить пользователя по email"""
        query = select(User).where(User.email == email.lower()).options(
            joinedload(User.telegram_account)
        )
        result = await self.db.execute(query)
        return result.unique().scalar_one_or_none()

    async def register_user(
        self,
        email: str,
        password: str,
        agree_personal_data: bool,
        agree_terms: bool,
        access_token: str,
        refresh_token: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> User:
        """
        Регистрация нового пользователя по email
        """
        # Проверяем, что пользователь согласился с условиями
        if not agree_personal_data:
            raise HTTPException(
                status_code=400, detail="Personal data consent is required")
        if not agree_terms:
            raise HTTPException(status_code=400, detail="Terms of service must be accepted")

        # Проверяем, существует ли пользователь с таким email
        existing_user = await self.get_user_by_email(email)
        if existing_user:
            raise HTTPException(status_code=409, detail="User with this email already exists")

        # Создаём пользователя
        password_hash = self.hash_password(password)

        user = User(
            email=email.lower(),
            password_hash=password_hash,
            agree_personal_data=agree_personal_data,
            agree_terms=agree_terms,
            email_verified=False,
            is_active=True
        )
        self.db.add(user)
        await self.db.flush()

        # Создаём сессию
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

        await self.db.flush()

        # Перезагружаем пользователя с telegram_account
        query = select(User).where(User.id == user.id).options(
            joinedload(User.telegram_account)
        )
        result = await self.db.execute(query)
        user = result.unique().scalar_one()

        return user

    async def authenticate_by_email(
        self,
        email: str,
        password: str,
        access_token: str,
        refresh_token: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> User:
        """
        Авторизация пользователя по email/password
        """
        user = await self.get_user_by_email(email)

        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not user.password_hash:
            raise HTTPException(
                status_code=400, detail="No password set for this account. Use Telegram login")

        if not self.verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated")

        # Создаём сессию
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

        await self.db.flush()

        # Перезагружаем пользователя с telegram_account
        query = select(User).where(User.id == user.id).options(
            joinedload(User.telegram_account)
        )
        result = await self.db.execute(query)
        user = result.unique().scalar_one()

        return user

    async def add_email_to_existing_user(
        self,
        user_id: int,
        email: str,
        password: str,
        agree_personal_data: bool,
        agree_terms: bool
    ) -> User:
        """
        Добавить email/password к существующему пользователю (например, после Telegram авторизации)
        """
        if not agree_personal_data:
            raise HTTPException(
                status_code=400, detail="Personal data consent is required")
        if not agree_terms:
            raise HTTPException(status_code=400, detail="Terms of service must be accepted")

        # Проверяем, что email не занят
        existing_user = await self.get_user_by_email(email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=409, detail="This email is already used by another account")

        # Получаем пользователя
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Обновляем данные
        user.email = email.lower()
        user.password_hash = self.hash_password(password)
        user.agree_personal_data = agree_personal_data
        user.agree_terms = agree_terms

        await self.db.flush()

        # Перезагружаем пользователя с telegram_account
        query = select(User).where(User.id == user.id).options(
            joinedload(User.telegram_account)
        )
        result = await self.db.execute(query)
        user = result.unique().scalar_one()

        return user
