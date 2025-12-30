"""Главный сервис аутентификации"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import User, UserSession, UserRole, BotLoginCode
from backend.schemas.auth import TelegramAuthPayload, UserUpdateRequest

from .token_service import TokenService
from .widget_auth import WidgetAuthService
from .bot_auth import BotAuthService
from .email_auth import EmailAuthService
from .user_crud import UserCRUDService
from .session_service import SessionService
from .stats_service import StatsService


class AuthService:
    """Главный сервис аутентификации"""

    def __init__(
        self,
        db: AsyncSession,
        bot_token: str,
        jwt_secret: str,
        jwt_algorithm: str = "HS256",
        access_token_expire_minutes: int = 60 * 24,
        refresh_token_expire_days: int = 30
    ):
        self.db = db
        self.bot_token = bot_token
        self.jwt_secret = jwt_secret
        self.jwt_algorithm = jwt_algorithm
        self.access_token_expire_minutes = access_token_expire_minutes
        self.refresh_token_expire_days = refresh_token_expire_days

        self.token_service = TokenService(
            db, jwt_secret, jwt_algorithm,
            access_token_expire_minutes, refresh_token_expire_days
        )
        self.widget_auth = WidgetAuthService(
            db, bot_token, access_token_expire_minutes
        )
        self.bot_auth = BotAuthService(
            db, access_token_expire_minutes
        )
        self.email_auth = EmailAuthService(
            db, access_token_expire_minutes
        )
        self.user_crud = UserCRUDService(db)
        self.session_service = SessionService(db)
        self.stats_service = StatsService(db)

    # ========================================================================
    # Токены
    # ========================================================================

    def create_access_token(self, user_id: int) -> str:
        """Создать access token"""
        return self.token_service.create_access_token(user_id)

    def create_refresh_token(self, user_id: int) -> str:
        """Создать refresh token"""
        return self.token_service.create_refresh_token(user_id)

    async def verify_access_token(self, token: str) -> Optional[User]:
        """Проверить access token"""
        return await self.token_service.verify_access_token(token)

    async def refresh_access_token(self, refresh_token: str) -> Tuple[str, str]:
        """Обновить access token"""
        return await self.token_service.refresh_access_token(refresh_token)

    async def logout(self, token: str) -> bool:
        """Завершить сессию"""
        return await self.token_service.logout(token)

    # ========================================================================
    # Авторизация через Widget
    # ========================================================================

    def verify_telegram_auth(self, auth_data: TelegramAuthPayload) -> bool:
        """Проверить подлинность данных от Telegram Widget"""
        return self.widget_auth.verify_telegram_auth(auth_data)

    async def authenticate_telegram_user(
        self,
        auth_data: TelegramAuthPayload,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[User, str, str]:
        """
        Аутентифицировать пользователя через Telegram Widget
        Возвращает: (User, access_token, refresh_token)
        """
        # WidgetAuthService создаёт UserSession. Раньше мы передавали "временные" токены
        # (user_id=0), а затем возвращали на фронт новые токены с реальным user_id.
        # Из-за проверки токена через таблицу user_sessions это ломало все запросы с фронта
        # (сессии в БД нет для финального access_token). Поэтому:
        # 1) создаём временные токены для вставки сессии
        # 2) после получения user.id обновляем эту сессию на финальные токены
        temp_access_token = self.create_access_token(0)
        temp_refresh_token = self.create_refresh_token(0)
        
        user = await self.widget_auth.authenticate_telegram_user(
            auth_data, temp_access_token, temp_refresh_token, user_agent, ip_address
        )
        
        access_token = self.create_access_token(user.id)
        refresh_token = self.create_refresh_token(user.id)

        # Обновляем созданную сессию на финальные токены
        query = select(UserSession).where(
            UserSession.user_id == user.id,
            UserSession.access_token == temp_access_token,
            UserSession.is_active == True,
        )
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()

        if session:
          session.access_token = access_token
          session.refresh_token = refresh_token
          session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
          session.last_used_at = datetime.now(timezone.utc)
          await self.db.commit()
        
        return user, access_token, refresh_token

    # ========================================================================
    # Авторизация через бота
    # ========================================================================

    async def authenticate_bot_user_direct(
        self,
        telegram_id: int,
        username: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        photo_url: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[User, str, str]:
        """
        Авторизация через telegram_id
        Возвращает: (User, access_token, refresh_token)
        """
        # Получаем или создаём пользователя
        user = await self.bot_auth.get_or_create_user_by_telegram_id(
            telegram_id, username, first_name, last_name, photo_url
        )
        
        # Создаём токены
        access_token = self.create_access_token(user.id)
        refresh_token = self.create_refresh_token(user.id)
        
        # Сохраняем сессию
        await self.bot_auth.create_direct_session(
            user, access_token, refresh_token, user_agent, ip_address
        )
        
        return user, access_token, refresh_token

    # ========================================================================
    # CRUD пользователей
    # ========================================================================

    async def get_user(self, user_id: int) -> Optional[User]:
        """Получить пользователя по ID"""
        return await self.user_crud.get_user(user_id)

    async def get_user_by_telegram_id(self, telegram_id: int) -> Optional[User]:
        """Получить пользователя по Telegram ID"""
        return await self.user_crud.get_user_by_telegram_id(telegram_id)

    async def get_users(
        self,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[User], int]:
        """Получить список пользователей"""
        return await self.user_crud.get_users(role, is_active, skip, limit)

    async def update_user(self, user_id: int, data: UserUpdateRequest) -> Optional[User]:
        """Обновить пользователя"""
        return await self.user_crud.update_user(user_id, data)

    async def delete_user(self, user_id: int) -> bool:
        """Удалить пользователя"""
        return await self.user_crud.delete_user(user_id)

    # ========================================================================
    # Сессии
    # ========================================================================

    async def get_user_sessions(self, user_id: int) -> Tuple[List[UserSession], int]:
        """Получить список сессий пользователя"""
        return await self.session_service.get_user_sessions(user_id)

    async def revoke_session(self, session_id: int, user_id: int) -> bool:
        """Отозвать сессию"""
        return await self.session_service.revoke_session(session_id, user_id)

    # ========================================================================
    # Статистика
    # ========================================================================

    async def get_user_stats(self, user_id: int) -> dict:
        """Получить статистику пользователя"""
        return await self.stats_service.get_user_stats(user_id)

    # ========================================================================
    # Email/Password авторизация
    # ========================================================================

    async def register_with_email(
        self,
        email: str,
        password: str,
        agree_personal_data: bool,
        agree_terms: bool,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[User, str, str]:
        """
        Регистрация пользователя по email
        Возвращает: (User, access_token, refresh_token)
        """
        # EmailAuthService создаёт UserSession. Для совместимости с проверкой токена
        # через таблицу user_sessions сначала используем временные токены, затем
        # обновляем эту же сессию на финальные токены с реальным user_id.
        temp_access_token = self.create_access_token(0)
        temp_refresh_token = self.create_refresh_token(0)
        
        user = await self.email_auth.register_user(
            email=email,
            password=password,
            agree_personal_data=agree_personal_data,
            agree_terms=agree_terms,
            access_token=temp_access_token,
            refresh_token=temp_refresh_token,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        # Создаём токены с правильным user_id
        access_token = self.create_access_token(user.id)
        refresh_token = self.create_refresh_token(user.id)

        query = select(UserSession).where(
            UserSession.user_id == user.id,
            UserSession.access_token == temp_access_token,
            UserSession.is_active == True,
        )
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()

        if session:
            session.access_token = access_token
            session.refresh_token = refresh_token
            session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
            session.last_used_at = datetime.now(timezone.utc)
            await self.db.commit()
        
        return user, access_token, refresh_token

    async def login_with_email(
        self,
        email: str,
        password: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[User, str, str]:
        """
        Вход пользователя по email/password
        Возвращает: (User, access_token, refresh_token)
        """
        # EmailAuthService создаёт UserSession. Сначала пишем временные токены,
        # затем обновляем запись на финальные токены.
        temp_access_token = self.create_access_token(0)
        temp_refresh_token = self.create_refresh_token(0)
        
        user = await self.email_auth.authenticate_by_email(
            email=email,
            password=password,
            access_token=temp_access_token,
            refresh_token=temp_refresh_token,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        # Создаём токены с правильным user_id
        access_token = self.create_access_token(user.id)
        refresh_token = self.create_refresh_token(user.id)

        query = select(UserSession).where(
            UserSession.user_id == user.id,
            UserSession.access_token == temp_access_token,
            UserSession.is_active == True,
        )
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()

        if session:
            session.access_token = access_token
            session.refresh_token = refresh_token
            session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
            session.last_used_at = datetime.now(timezone.utc)
            await self.db.commit()
        
        return user, access_token, refresh_token

    async def add_email_to_user(
        self,
        user_id: int,
        email: str,
        password: str,
        agree_personal_data: bool,
        agree_terms: bool
    ) -> User:
        """
        Добавить email/password к существующему пользователю
        (например, после Telegram авторизации для резервного входа)
        """
        return await self.email_auth.add_email_to_existing_user(
            user_id=user_id,
            email=email,
            password=password,
            agree_personal_data=agree_personal_data,
            agree_terms=agree_terms
        )
