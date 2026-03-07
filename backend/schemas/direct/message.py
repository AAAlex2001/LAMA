from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from backend.models.bots import MessageType
from backend.schemas.bots.messages import BotMessageResponse

class EditMessageRequest(BaseModel):
    text_content: Optional[str] = None

class DeleteMessageRequest(BaseModel):
    pass

class ChatHistoryResponse(BaseModel):
    items: List[BotMessageResponse]
    total: int
    page: int
    page_size: int
