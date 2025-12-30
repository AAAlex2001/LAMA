"""
Модуль аутентификации
"""
from .auth_service import AuthService
from .token_service import TokenService
from .widget_auth import WidgetAuthService
from .bot_auth import BotAuthService
from .email_auth import EmailAuthService
from .user_crud import UserCRUDService
from .session_service import SessionService
from .stats_service import StatsService

__all__ = [
    "AuthService",
    "TokenService",
    "WidgetAuthService",
    "BotAuthService",
    "EmailAuthService",
    "UserCRUDService",
    "SessionService",
    "StatsService",
]
