from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Email + пароль + согласия для регистрации."""

    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    agree_personal_data: bool
    agree_terms: bool


class EmailLoginRequest(BaseModel):
    """Email + пароль для входа."""

    email: EmailStr
    password: str


class AddEmailRequest(BaseModel):
    """Запрос добавления email/пароля к telegram-only аккаунту."""

    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    agree_personal_data: bool
    agree_terms: bool
