from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User, UserRole
from backend.services.auth.features.tokens.verify_access_token import VerifyAccessToken
from backend.services.auth.settings import AuthSettings, load_auth_settings
from backend.services.auth.types import ClientContext

http_bearer = HTTPBearer(auto_error=False)


def get_auth_settings() -> AuthSettings:
    return load_auth_settings()


def get_client_context(request: Request) -> ClientContext:
    return ClientContext(
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    db: AsyncSession = Depends(get_db),
    settings: AuthSettings = Depends(get_auth_settings),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await VerifyAccessToken(db, settings).execute(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
