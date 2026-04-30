from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.auth.features.email.passwords import verify_password
from backend.services.auth.features.sessions.create_user_session import CreateUserSession
from backend.services.auth.features.tokens.create_access_token import CreateAccessToken
from backend.services.auth.features.tokens.create_refresh_token import CreateRefreshToken
from backend.services.auth.features.users.get_user import GetUser
from backend.services.auth.features.users.get_user_by_email import GetUserByEmail
from backend.services.auth.settings import AuthSettings
from backend.services.auth.types import AuthResult, ClientContext


class LoginWithEmail:
    def __init__(self, db: AsyncSession, settings: AuthSettings):
        self.db = db
        self.settings = settings

    async def execute(
        self,
        email: str,
        password: str,
        context: ClientContext | None = None,
    ) -> AuthResult:
        user = await GetUserByEmail(self.db).execute(email)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not user.password_hash:
            raise HTTPException(status_code=400, detail="No password set for this account")
        if not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
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
            user=await GetUser(self.db).execute(user.id),
            access_token=access_token,
            refresh_token=refresh_token,
        )
