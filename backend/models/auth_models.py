"""
Модели данных для регистрации и входа пользователя.
Содержат валидируемые поля: email (логин) и пароль.
"""

from pydantic import BaseModel, EmailStr, Field, SecretStr
from typing import Optional


class RegistrationModel(BaseModel):
    """Данные, необходимые для регистрации пользователя."""

    email: EmailStr = Field(
        ..., description="Email пользователя, используется как логин"
    )
    password: SecretStr = Field(
        ..., min_length=8, max_length=128, description="Пароль (минимум 8 символов)"
    )


class LoginModel(BaseModel):
    """Данные для входа пользователя."""

    email: EmailStr = Field(
        ..., description="Email пользователя, используется как логин"
    )
    password: SecretStr = Field(
        ..., min_length=8, max_length=128, description="Пароль пользователя"
    )

class AuthSuccessResponse(BaseModel):
    """Успешный ответ при регистрации/логине."""

    message: str = Field(..., description="Текстовое сообщение об успехе")
    user_email: EmailStr = Field(..., description="Email пользователя")


class AuthErrorResponse(BaseModel):
    """Стандартизированный ответ об ошибке аутентификации/регистрации."""

    detail: str = Field(..., description="Описание ошибки для клиента")


class TelegramAuthModel(BaseModel):
    """Данные для аутентификации через Telegram Login Widget.

    Поля соответствуют спецификации Telegram. `hash` используется для проверки целостности.
    """

    id: int = Field(..., description="ID пользователя Telegram")
    first_name: Optional[str] = Field(None, description="Имя пользователя Telegram")
    last_name: Optional[str] = Field(None, description="Фамилия пользователя Telegram")
    username: Optional[str] = Field(None, description="Username без @")
    photo_url: Optional[str] = Field(None, description="URL аватара Telegram")
    auth_date: int = Field(..., description="Момент авторизации (unix timestamp)")
    hash: str = Field(..., description="Подпись для проверки целостности данных")


class TelegramAuthResponse(BaseModel):
    """Ответ при успешной аутентификации через Telegram."""

    success: bool = Field(True, description="Результат обработки сервером")
    user_id: int = Field(..., description="ID пользователя в приложении или Telegram")
    token: Optional[str] = Field(
        None, description="Выданный токен (если предусмотрено сервером)"
    )


__all__ = [
    "RegistrationModel",
    "LoginModel",
    "AuthSuccessResponse",
    "AuthErrorResponse",
    "TelegramAuthModel",
    "TelegramAuthResponse",
]


