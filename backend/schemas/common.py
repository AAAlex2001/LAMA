"""
Общие DTO для замены сырых dict/tuple возвратов в сервисах.
"""
from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, ConfigDict


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str


class CaptchaChallenge(BaseModel):
    question: str
    answer: str


class TargetUser(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None


class MessageBlockDecision(BaseModel):
    should_block: bool
    reason: Optional[str] = None


class IncomingMediaInfo(BaseModel):
    media_type: str
    file_id: Optional[str] = None


class DownloadedMedia(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    file_bytes: bytes
    mime_type: str


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int


class BotInfoFetch(BaseModel):
    bot_id: int
    username: str
    first_name: str
    description: Optional[str] = None
    short_description: Optional[str] = None


class ShortcodeContext(BaseModel):
    user_id: int
    user_name: str
    user_username: str
    bot_name: str
    bot_username: str


class UploadResult(BaseModel):
    url: str
    path: str
    size: int
    thumbnail_url: Optional[str] = None
    type: str = "document"
    name: str = ""
