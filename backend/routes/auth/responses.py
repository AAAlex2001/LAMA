from backend.models.auth import User
from backend.schemas.auth import AuthResponse
from backend.services.auth.settings import AuthSettings
from backend.services.auth.types import AuthResult


def registration_completed(user: User) -> bool:
    return bool(user.email and user.agree_terms and user.agree_personal_data)


def build_auth_response(
    result: AuthResult,
    settings: AuthSettings,
    completed: bool | None = None,
) -> AuthResponse:
    return AuthResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=result.user,
        registration_completed=registration_completed(result.user) if completed is None else completed,
    )
