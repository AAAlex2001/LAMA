"""
Схемы для системы аутентификации
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr

from backend.models.auth import UserRole


# ============================================================================
# Telegram Auth
# ============================================================================

class TelegramAuthPayload(BaseModel):
    """
    Данные от Telegram Login Widget
    https://core.telegram.org/widgets/login#receiving-authorization-data
    """
    id: int = Field(..., description="Telegram user ID")
    first_name: str = Field(..., description="Имя пользователя")
    last_name: Optional[str] = Field(None, description="Фамилия пользователя")
    username: Optional[str] = Field(None, description="Username пользователя")
    photo_url: Optional[str] = Field(None, description="URL фото профиля")
    auth_date: int = Field(..., description="Unix timestamp авторизации")
    hash: str = Field(..., description="Хеш для проверки подлинности")


# ============================================================================
# Email/Password Auth
# ============================================================================

class RegisterRequest(BaseModel):
    """Запрос на регистрацию по email"""
    email: EmailStr = Field(..., description="Электронная почта")
    password: str = Field(..., min_length=6, max_length=128, description="Пароль (минимум 6 символов)")
    agree_personal_data: bool = Field(..., description="Согласие на обработку персональных данных")
    agree_terms: bool = Field(..., description="Согласие с условиями использования")


class EmailLoginRequest(BaseModel):
    """Запрос на вход по email"""
    email: EmailStr = Field(..., description="Электронная почта")
    password: str = Field(..., description="Пароль")


class AuthResponse(BaseModel):
    """Ответ при успешной авторизации"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: Optional[str] = Field(None, description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Тип токена")
    expires_in: int = Field(..., description="Время жизни токена в секундах")
    user: "UserResponse"
    registration_completed: bool = Field(..., description="Регистрация завершена (email добавлен, условия приняты)")


class RefreshTokenRequest(BaseModel):
    """Запрос на обновление токена"""
    refresh_token: str = Field(..., description="Refresh token")


class BotLoginRequest(BaseModel):
    """Запрос на авторизацию через бота по telegram_id"""
    telegram_id: int = Field(..., description="Telegram user ID")
    username: Optional[str] = Field(None, description="Username пользователя")
    first_name: Optional[str] = Field(None, description="Имя пользователя")
    last_name: Optional[str] = Field(None, description="Фамилия пользователя")
    photo_url: Optional[str] = Field(None, description="URL фото профиля")


# ============================================================================
# User
# ============================================================================

class TelegramAccountResponse(BaseModel):
    """Информация о Telegram-аккаунте"""
    telegram_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """Информация о пользователе"""
    id: int
    role: UserRole
    is_active: bool
    email: Optional[str] = None
    email_verified: bool = False
    agree_terms: bool = False
    agree_personal_data: bool = False
    created_at: datetime
    updated_at: datetime
    telegram_account: Optional[TelegramAccountResponse] = None

    class Config:
        from_attributes = True


class AddEmailRequest(BaseModel):
    """Запрос на добавление email к существующему аккаунту"""
    email: EmailStr = Field(..., description="Электронная почта")
    password: str = Field(..., min_length=6, max_length=128, description="Пароль")
    agree_personal_data: bool = Field(..., description="Согласие на обработку персональных данных")
    agree_terms: bool = Field(..., description="Согласие с условиями использования")


class UserUpdateRequest(BaseModel):
    """Обновление информации о пользователе (только для админа)"""
    role: Optional[UserRole] = Field(None, description="Роль пользователя")
    is_active: Optional[bool] = Field(None, description="Активность пользователя")


# ============================================================================
# Sessions
# ============================================================================

class SessionResponse(BaseModel):
    """Информация о сессии"""
    id: int
    user_id: int
    expires_at: datetime
    is_active: bool
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_used_at: datetime

    class Config:
        from_attributes = True


class SessionListResponse(BaseModel):
    """Список сессий"""
    items: list[SessionResponse]
    total: int


# ============================================================================
# Statistics
# ============================================================================

class UserStatsResponse(BaseModel):
    """Статистика пользователя"""
    user_id: int
    total_bots: int
    active_bots: int
    total_channels: int
    active_channels: int
    total_publications: int
    published_publications: int
    total_sessions: int
    active_sessions: int


