from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import User, UserRole
from backend.services.auth.features.email.passwords import hash_password
from backend.services.auth.features.sessions.create_user_session import CreateUserSession
from backend.services.auth.features.tokens.create_access_token import CreateAccessToken
from backend.services.auth.features.tokens.create_refresh_token import CreateRefreshToken
from backend.services.auth.features.users.get_user import GetUser
from backend.services.auth.features.users.get_user_by_email import GetUserByEmail
from backend.services.auth.settings import AuthSettings
from backend.services.auth.types import AuthResult, ClientContext


class RegisterWithEmail:
    """Регистрация по email/паролю: bcrypt-хеш + проверка согласий + выпуск пары токенов."""

    def __init__(self, db: AsyncSession, settings: AuthSettings):
        self.db = db
        self.settings = settings

    async def execute(
        self,
        email: str,
        password: str,
        agree_personal_data: bool,
        agree_terms: bool,
        context: ClientContext | None = None,
    ) -> AuthResult:
        if not agree_personal_data:
            raise HTTPException(status_code=400, detail="Personal data consent is required")
        if not agree_terms:
            raise HTTPException(status_code=400, detail="Terms of service must be accepted")

        normalized_email = email.lower()
        if await GetUserByEmail(self.db).execute(normalized_email):
            raise HTTPException(status_code=409, detail="User with this email already exists")

        user = User(
            role=UserRole.USER,
            is_active=True,
            email=normalized_email,
            password_hash=hash_password(password),
            email_verified=False,
            agree_personal_data=agree_personal_data,
            agree_terms=agree_terms,
        )
        self.db.add(user)
        await self.db.flush()

        access_token = CreateAccessToken(self.settings).execute(user.id)
        refresh_token = CreateRefreshToken(self.settings).execute(user.id)
        await CreateUserSession(self.db, self.settings).execute(
            user.id,
            access_token,
            refresh_token,
            context,
        )

        return AuthResult(
            user=await GetUser(self.db).execute(user.id),
            access_token=access_token,
            refresh_token=refresh_token,
        )
