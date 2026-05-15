from typing import Optional, List
from pydantic import BaseModel

from backend.schemas.bots.messages import BotMessageResponse

class EditMessageRequest(BaseModel):
    """Запрос на редактирование текста/caption сообщения."""

    text_content: Optional[str] = None

class ChatHistoryResponse(BaseModel):
    """История сообщений чата + total + has_more."""

    items: List[BotMessageResponse]
    total: int
    page: int
    page_size: int
    has_more: bool = False
