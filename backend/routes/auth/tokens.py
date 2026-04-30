from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth.dependencies import get_auth_settings
from backend.routes.auth.responses import build_auth_response
from backend.schemas.auth import AuthResponse, RefreshTokenRequest
from backend.services.auth.features.tokens.logout_session import LogoutSession
from backend.services.auth.features.tokens.refresh_token_pair import RefreshTokenPair
from backend.services.auth.settings import AuthSettings

router = APIRouter()


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    settings: AuthSettings = Depends(get_auth_settings),
):
    result = await RefreshTokenPair(db, settings).execute(data.refresh_token)
    return build_auth_response(result, settings)


@router.post("/logout", status_code=204)
async def logout(
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    await LogoutSession(db).execute(authorization.removeprefix("Bearer ").strip())
    return Response(status_code=204)
