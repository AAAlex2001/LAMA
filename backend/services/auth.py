"""
Сервис для работы с аутентификацией
"""
import hashlib
import hmac
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, List

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

from backend.models.auth import User, TelegramAccount, UserSession, UserRole
from backend.schemas.auth import TelegramAuthPayload, UserUpdateRequest


class AuthService:
    """Сервис для работы с аутентификацией"""

    def __init__(
        self,
        db: AsyncSession,
        bot_token: str,
        jwt_secret: str,
        jwt_algorithm: str = "HS256",
        access_token_expire_minutes: int = 60 * 24,  # 24 часа
        refresh_token_expire_days: int = 30  # 30 дней
    ):
        self.db = db
        self.bot_token = bot_token
        self.jwt_secret = jwt_secret
        self.jwt_algorithm = jwt_algorithm
        self.access_token_expire_minutes = access_token_expire_minutes
        self.refresh_token_expire_days = refresh_token_expire_days

    # ========================================================================
    # Telegram Login Widget
    # ========================================================================

    def verify_telegram_auth(self, auth_data: TelegramAuthPayload) -> bool:
        """
        Проверить подлинность данных от Telegram Login Widget
        https://core.telegram.org/widgets/login#checking-authorization
        """
        # Собираем данные для проверки
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

        # Сортируем по ключу и формируем строку
        data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(check_data.items())])

        # Вычисляем hash
        secret_key = hashlib.sha256(self.bot_token.encode()).digest()
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()

        # Проверяем срок действия (не более 24 часов)
        now = datetime.now(timezone.utc).timestamp()
        if now - auth_data.auth_date > 86400:  # 24 hours
            return False

        return computed_hash == auth_data.hash

    async def authenticate_telegram_user(
        self,
        auth_data: TelegramAuthPayload,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[User, str, str]:
        """
        Аутентифицировать пользователя через Telegram
        Возвращает: (User, access_token, refresh_token)
        """
        # Проверяем подлинность
        if not self.verify_telegram_auth(auth_data):
            raise ValueError("Invalid Telegram authentication data")

        # Ищем существующий Telegram-аккаунт с eager loading user
        from sqlalchemy.orm import selectinload
        
        query = select(TelegramAccount).options(
            selectinload(TelegramAccount.user)
        ).where(TelegramAccount.telegram_id == auth_data.id)
        result = await self.db.execute(query)
        telegram_account = result.scalar_one_or_none()

        if telegram_account:
            # Обновляем данные
            telegram_account.username = auth_data.username
            telegram_account.first_name = auth_data.first_name
            telegram_account.last_name = auth_data.last_name
            telegram_account.photo_url = auth_data.photo_url
            telegram_account.auth_date = datetime.fromtimestamp(auth_data.auth_date, tz=timezone.utc)
            telegram_account.updated_at = datetime.now(timezone.utc)

            user = telegram_account.user
        else:
            # Создаём нового пользователя
            user = User(
                role=UserRole.USER,
                is_active=True
            )
            self.db.add(user)
            await self.db.flush()  # Получаем user.id

            # Создаём Telegram-аккаунт
            telegram_account = TelegramAccount(
                user_id=user.id,
                telegram_id=auth_data.id,
                username=auth_data.username,
                first_name=auth_data.first_name,
                last_name=auth_data.last_name,
                photo_url=auth_data.photo_url,
                auth_date=datetime.fromtimestamp(auth_data.auth_date, tz=timezone.utc)
            )
            self.db.add(telegram_account)

        # Генерируем токены
        access_token = self.create_access_token(user.id)
        refresh_token = self.create_refresh_token(user.id)

        # Создаём сессию
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
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
        
        # Явно подгружаем telegram_account для избежания MissingGreenlet
        from sqlalchemy.orm import selectinload
        
        query = select(User).options(
            selectinload(User.telegram_account)
        ).where(User.id == user.id)
        result = await self.db.execute(query)
        user = result.scalar_one()

        return user, access_token, refresh_token

    def create_access_token(self, user_id: int) -> str:
        """Создать access token"""
        expires = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        payload = {
            "sub": str(user_id),
            "type": "access",
            "exp": expires,
            "iat": datetime.now(timezone.utc),
            "jti": secrets.token_urlsafe(16)
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    def create_refresh_token(self, user_id: int) -> str:
        """Создать refresh token"""
        expires = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
        payload = {
            "sub": str(user_id),
            "type": "refresh",
            "exp": expires,
            "iat": datetime.now(timezone.utc),
            "jti": secrets.token_urlsafe(16)
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    async def verify_access_token(self, token: str) -> Optional[User]:
        """Проверить access token и вернуть пользователя"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user_id = int(payload.get("sub"))
            token_type = payload.get("type")

            if token_type != "access":
                return None

            # Проверяем сессию
            query = select(UserSession).where(
                UserSession.access_token == token,
                UserSession.is_active == True
            )
            result = await self.db.execute(query)
            session = result.scalar_one_or_none()

            if not session:
                return None

            # Обновляем last_used_at
            session.last_used_at = datetime.now(timezone.utc)
            await self.db.commit()

            # Получаем пользователя
            user = await self.get_user(user_id)
            return user if user and user.is_active else None

        except JWTError:
            return None

    async def refresh_access_token(self, refresh_token: str) -> Tuple[str, str]:
        """
        Обновить access token по refresh token
        Возвращает: (new_access_token, new_refresh_token)
        """
        try:
            payload = jwt.decode(refresh_token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user_id = int(payload.get("sub"))
            token_type = payload.get("type")

            if token_type != "refresh":
                raise ValueError("Invalid token type")

            # Проверяем сессию
            query = select(UserSession).where(
                UserSession.refresh_token == refresh_token,
                UserSession.is_active == True
            )
            result = await self.db.execute(query)
            session = result.scalar_one_or_none()

            if not session:
                raise ValueError("Invalid or expired refresh token")

            # Генерируем новые токены
            new_access_token = self.create_access_token(user_id)
            new_refresh_token = self.create_refresh_token(user_id)

            # Обновляем сессию
            session.access_token = new_access_token
            session.refresh_token = new_refresh_token
            session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
            session.last_used_at = datetime.now(timezone.utc)

            await self.db.commit()

            return new_access_token, new_refresh_token

        except JWTError:
            raise ValueError("Invalid or expired refresh token")

    async def logout(self, token: str) -> bool:
        """Завершить сессию (logout)"""
        query = select(UserSession).where(UserSession.access_token == token)
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()

        if not session:
            return False

        session.is_active = False
        await self.db.commit()
        return True

    # ========================================================================
    # CRUD для пользователей
    # ========================================================================

    async def get_user(self, user_id: int) -> Optional[User]:
        """Получить пользователя по ID"""
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_by_telegram_id(self, telegram_id: int) -> Optional[User]:
        """Получить пользователя по Telegram ID"""
        query = select(User).join(TelegramAccount).where(TelegramAccount.telegram_id == telegram_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_users(
        self,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[User], int]:
        """Получить список пользователей с фильтрацией"""
        query = select(User)

        if role:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)

        # Подсчёт
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Получение данных с пагинацией
        query = query.order_by(desc(User.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(query)
        users = list(result.scalars().all())

        return users, total

    async def update_user(self, user_id: int, data: UserUpdateRequest) -> Optional[User]:
        """Обновить пользователя (только для админа)"""
        user = await self.get_user(user_id)
        if not user:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        user.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def delete_user(self, user_id: int) -> bool:
        """Удалить пользователя"""
        user = await self.get_user(user_id)
        if not user:
            return False

        await self.db.delete(user)
        await self.db.commit()
        return True

    # ========================================================================
    # Сессии
    # ========================================================================

    async def get_user_sessions(self, user_id: int) -> Tuple[List[UserSession], int]:
        """Получить список сессий пользователя"""
        query = select(UserSession).where(UserSession.user_id == user_id)

        # Подсчёт
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Получение данных
        query = query.order_by(desc(UserSession.created_at))
        result = await self.db.execute(query)
        sessions = list(result.scalars().all())

        return sessions, total

    async def revoke_session(self, session_id: int, user_id: int) -> bool:
        """Отозвать сессию"""
        query = select(UserSession).where(
            UserSession.id == session_id,
            UserSession.user_id == user_id
        )
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()

        if not session:
            return False

        session.is_active = False
        await self.db.commit()
        return True

    # ========================================================================
    # Статистика
    # ========================================================================

    async def get_user_stats(self, user_id: int) -> dict:
        """Получить статистику пользователя"""
        from backend.models.bots import Bot as BotModel, BotStatus
        from backend.models.channels import ChannelGroup
        from backend.models.publications import Publication, PublicationStatus

        # Боты
        total_bots_query = select(func.count()).where(BotModel.owner_id == user_id)
        total_bots_result = await self.db.execute(total_bots_query)
        total_bots = total_bots_result.scalar() or 0

        active_bots_query = select(func.count()).where(
            BotModel.owner_id == user_id,
            BotModel.status == BotStatus.ACTIVE
        )
        active_bots_result = await self.db.execute(active_bots_query)
        active_bots = active_bots_result.scalar() or 0

        # Каналы
        total_channels_query = select(func.count()).where(ChannelGroup.owner_id == user_id)
        total_channels_result = await self.db.execute(total_channels_query)
        total_channels = total_channels_result.scalar() or 0

        active_channels_query = select(func.count()).where(
            ChannelGroup.owner_id == user_id,
            ChannelGroup.is_active == True
        )
        active_channels_result = await self.db.execute(active_channels_query)
        active_channels = active_channels_result.scalar() or 0

        # Публикации
        total_publications_query = select(func.count()).where(Publication.owner_id == user_id)
        total_publications_result = await self.db.execute(total_publications_query)
        total_publications = total_publications_result.scalar() or 0

        published_publications_query = select(func.count()).where(
            Publication.owner_id == user_id,
            Publication.status == PublicationStatus.PUBLISHED
        )
        published_publications_result = await self.db.execute(published_publications_query)
        published_publications = published_publications_result.scalar() or 0

        # Сессии
        total_sessions_query = select(func.count()).where(UserSession.user_id == user_id)
        total_sessions_result = await self.db.execute(total_sessions_query)
        total_sessions = total_sessions_result.scalar() or 0

        active_sessions_query = select(func.count()).where(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        )
        active_sessions_result = await self.db.execute(active_sessions_query)
        active_sessions = active_sessions_result.scalar() or 0

        return {
            "user_id": user_id,
            "total_bots": total_bots,
            "active_bots": active_bots,
            "total_channels": total_channels,
            "active_channels": active_channels,
            "total_publications": total_publications,
            "published_publications": published_publications,
            "total_sessions": total_sessions,
            "active_sessions": active_sessions
        }


