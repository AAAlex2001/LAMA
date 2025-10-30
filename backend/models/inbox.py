"""
Модели для модуля Inbox (переписка админа с пользователями через бота).
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class InboxMessage(BaseModel):
    user_id: int
    direction: str = Field(..., description="in|out")
    text: str
    ts: datetime


class InboxThread(BaseModel):
    bot_id: str
    user_id: int
    messages: List[InboxMessage] = Field(default_factory=list)


class InboxFilter(BaseModel):
    user_id: Optional[int] = None
    from_ts: Optional[datetime] = None
    to_ts: Optional[datetime] = None
    query: Optional[str] = None


class InboxListResponse(BaseModel):
    threads: List[InboxThread] = Field(default_factory=list)


__all__ = [
    "InboxMessage",
    "InboxThread",
    "InboxFilter",
    "InboxListResponse",
]
