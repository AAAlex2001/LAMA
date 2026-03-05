"""Pydantic-схемы polling-модуля."""

from pydantic import BaseModel
from typing import Optional, Any

from backend.models.bots import MessageType


class UserContext(BaseModel):
    id: int = 0
    first_name: str = ""
    username: Optional[str] = None


class BotContext(BaseModel):
    first_name: str = ""


class ShortcodeContext(BaseModel):
    """Контекст для обработки шорткодов в ответах бота."""
    user: UserContext = UserContext()
    bot: BotContext = BotContext()


class BotResponse(BaseModel):
    """Данные для отправки ответа бота (текст/медиа/кнопки)."""
    text: str
    media_url: Optional[str] = None
    media_type: Optional[MessageType] = None
    buttons: Optional[Any] = None
