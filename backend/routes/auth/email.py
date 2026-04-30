from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth.dependencies import (
    get_auth_settings,
    get_client_context,
    get_current_user,
)
from backend.routes.auth.responses import build_auth_response
from backend.schemas.auth import (
    AddEmailRequest,
    AuthResponse,
    EmailLoginRequest,
    RegisterRequest,
    UserResponse,
)
from backend.services.auth.features.email.add_email_to_user import AddEmailToUser
from backend.services.auth.features.email.login_with_email import LoginWithEmail
from backend.services.auth.features.email.register_with_email import RegisterWithEmail
from backend.services.auth.settings import AuthSettings

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
async def register_with_email(
    register_data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: AuthSettings = Depends(get_auth_settings),
):
    result = await RegisterWithEmail(db, settings).execute(
        email=register_data.email,
        password=register_data.password,
        agree_personal_data=register_data.agree_personal_data,
        agree_terms=register_data.agree_terms,
        context=get_client_context(request),
    )
    return build_auth_response(result, settings, completed=True)


@router.post("/login", response_model=AuthResponse)
async def login_with_email(
    login_data: EmailLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: AuthSettings = Depends(get_auth_settings),
):
    result = await LoginWithEmail(db, settings).execute(
        email=login_data.email,
        password=login_data.password,
        context=get_client_context(request),
    )
    return build_auth_response(result, settings)


@router.post("/me/add-email", response_model=UserResponse)
async def add_email_to_account(
    data: AddEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await AddEmailToUser(db).execute(
        user_id=current_user.id,
        email=data.email,
        password=data.password,
        agree_personal_data=data.agree_personal_data,
        agree_terms=data.agree_terms,
    )
