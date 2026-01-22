"""
Роуты для работы с аутентификацией
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.auth.auth_service import AuthService
from backend.models.auth import User, UserRole
from backend.schemas.auth import (
    TelegramAuthPayload,
    AuthResponse,
    RefreshTokenRequest,
    UserResponse,
    UserUpdateRequest,
    SessionListResponse,
    UserStatsResponse,
    BotLoginRequest,
    RegisterRequest,
    EmailLoginRequest,
    AddEmailRequest
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============================================================================
# Dependency
# ============================================================================

async def get_auth_service(db: AsyncSession = Depends(get_db)):
    """Получить сервис аутентификации"""
    import os
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    jwt_secret = os.getenv("JWT_SECRET", "")

    return AuthService(db, bot_token, jwt_secret)


async def get_current_user(
    authorization: Optional[str] = Header(None),
    service: AuthService = Depends(get_auth_service)
) -> User:
    """Получить текущего авторизованного пользователя"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    user = await service.verify_access_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Проверить, что текущий пользователь - администратор"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return current_user


# ============================================================================
# Аутентификация через Telegram
# ============================================================================

@router.post("/telegram", response_model=AuthResponse)
async def login_with_telegram(
    auth_data: TelegramAuthPayload,
    request: Request,
    service: AuthService = Depends(get_auth_service)
):
    """
    Войти через Telegram Login Widget
    
    Принимает данные от виджета, проверяет подпись и создаёт/обновляет пользователя.
    Возвращает JWT токены для дальнейшей работы с API.
    """
    try:
        user_agent = request.headers.get("user-agent")
        ip_address = request.client.host if request.client else None
        
        user, access_token, refresh_token = await service.authenticate_telegram_user(
            auth_data,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        # Проверяем, завершена ли регистрация (есть email и приняты условия)
        registration_completed = bool(user.email and user.agree_terms and user.agree_personal_data)
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=service.access_token_expire_minutes * 60,
            user=user,
            registration_completed=registration_completed
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


# ============================================================================
# Аутентификация через бота
# ============================================================================

@router.post("/bot-login", response_model=AuthResponse)
async def login_with_bot(
    login_data: BotLoginRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service)
):
    """
    Войти через бота по telegram_id
    
    Принимает telegram_id и данные пользователя из бота.
    Возвращает JWT токены для работы с API.
    """
    try:
        user_agent = request.headers.get("user-agent")
        ip_address = request.client.host if request.client else None
        
        user, access_token, refresh_token = await service.authenticate_bot_user_direct(
            telegram_id=login_data.telegram_id,
            username=login_data.username,
            first_name=login_data.first_name,
            last_name=login_data.last_name,
            photo_url=login_data.photo_url,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        # Проверяем, завершена ли регистрация (есть email и приняты условия)
        registration_completed = bool(user.email and user.agree_terms and user.agree_personal_data)
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=service.access_token_expire_minutes * 60,
            user=user,
            registration_completed=registration_completed
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bot login failed: {str(e)}")


@router.post("/bot-guest-token", response_model=AuthResponse)
async def create_guest_token_for_bot(
    login_data: BotLoginRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service)
):
    """
    Создать временный токен для гостевого доступа из бота
    
    Бот вызывает этот эндпоинт с telegram_id пользователя,
    создаётся временный токен на 24 часа для создания постов.
    """
    try:
        user_agent = request.headers.get("user-agent")
        ip_address = request.client.host if request.client else None
        
        # Создаем или получаем пользователя
        user, access_token, refresh_token = await service.authenticate_bot_user_direct(
            telegram_id=login_data.telegram_id,
            username=login_data.username,
            first_name=login_data.first_name,
            last_name=login_data.last_name,
            photo_url=login_data.photo_url,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=service.access_token_expire_minutes * 60,
            user=user,
            registration_completed=False  # Это гостевой доступ
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Guest token creation failed: {str(e)}")


# ============================================================================
# Регистрация и вход по Email
# ============================================================================

@router.post("/register", response_model=AuthResponse)
async def register_with_email(
    register_data: RegisterRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service)
):
    """
    Регистрация нового пользователя по email
    
    Создаёт нового пользователя с email/password.
    Требует согласия с обработкой персональных данных и условиями использования.
    """
    try:
        user_agent = request.headers.get("user-agent")
        ip_address = request.client.host if request.client else None
        
        user, access_token, refresh_token = await service.register_with_email(
            email=register_data.email,
            password=register_data.password,
            agree_personal_data=register_data.agree_personal_data,
            agree_terms=register_data.agree_terms,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=service.access_token_expire_minutes * 60,
            user=user,
            registration_completed=True  # Регистрация по email всегда завершена
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login", response_model=AuthResponse)
async def login_with_email(
    login_data: EmailLoginRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service)
):
    """
    Вход по email и паролю
    
    Авторизует пользователя по email/password.
    Возвращает JWT токены для работы с API.
    """
    try:
        user_agent = request.headers.get("user-agent")
        ip_address = request.client.host if request.client else None
        
        user, access_token, refresh_token = await service.login_with_email(
            email=login_data.email,
            password=login_data.password,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        # Проверяем, завершена ли регистрация
        registration_completed = bool(user.email and user.agree_terms and user.agree_personal_data)
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=service.access_token_expire_minutes * 60,
            user=user,
            registration_completed=registration_completed
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    service: AuthService = Depends(get_auth_service)
):
    """
    Обновить access token по refresh token
    """
    try:
        new_access_token, new_refresh_token = await service.refresh_access_token(data.refresh_token)
        
        # Получаем пользователя по новому токену
        user = await service.verify_access_token(new_access_token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Проверяем, завершена ли регистрация
        registration_completed = bool(user.email and user.agree_terms and user.agree_personal_data)
        
        return AuthResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=service.access_token_expire_minutes * 60,
            user=user,
            registration_completed=registration_completed
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")


@router.post("/logout", status_code=204)
async def logout(
    authorization: Optional[str] = Header(None),
    service: AuthService = Depends(get_auth_service)
):
    """
    Завершить текущую сессию (logout)
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    success = await service.logout(token)
    
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")


# ============================================================================
# Текущий пользователь
# ============================================================================

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Получить информацию о текущем пользователе
    """
    return current_user


@router.post("/me/add-email", response_model=UserResponse)
async def add_email_to_account(
    data: AddEmailRequest,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service)
):
    """
    Добавить email/password к существующему аккаунту
    
    Позволяет пользователю, авторизованному через Telegram,
    добавить email как резервный способ входа.
    """
    try:
        user = await service.add_email_to_user(
            user_id=current_user.id,
            email=data.email,
            password=data.password,
            agree_personal_data=data.agree_personal_data,
            agree_terms=data.agree_terms
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add email: {str(e)}")


@router.get("/me/stats", response_model=UserStatsResponse)
async def get_current_user_stats(
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service)
):
    """
    Получить статистику текущего пользователя
    """
    stats = await service.get_user_stats(current_user.id)
    return UserStatsResponse(**stats)


@router.get("/me/sessions", response_model=SessionListResponse)
async def get_current_user_sessions(
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service)
):
    """
    Получить список активных сессий текущего пользователя
    """
    sessions, total = await service.get_user_sessions(current_user.id)

    return SessionListResponse(
        items=sessions,
        total=total
    )


@router.delete("/me/sessions/{session_id}", status_code=204)
async def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service)
):
    """
    Отозвать конкретную сессию
    """
    success = await service.revoke_session(session_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")


# ============================================================================
# Управление пользователями (только для администратора)
# ============================================================================

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    service: AuthService = Depends(get_auth_service)
):
    """
    Получить пользователя по ID (только для администратора)
    """
    user = await service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    service: AuthService = Depends(get_auth_service)
):
    """
    Обновить пользователя (только для администратора)
    """
    user = await service.update_user(user_id, data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    service: AuthService = Depends(get_auth_service)
):
    """
    Удалить пользователя (только для администратора)
    """
    success = await service.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")


@router.get("/users/{user_id}/stats", response_model=UserStatsResponse)
async def get_user_stats(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    service: AuthService = Depends(get_auth_service)
):
    """
    Получить статистику пользователя (только для администратора)
    """
    stats = await service.get_user_stats(user_id)
    return UserStatsResponse(**stats)


