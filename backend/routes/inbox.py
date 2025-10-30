"""
API для модуля Inbox (переписка через бота).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from typing import Tuple

from backend.models.inbox import InboxFilter, InboxListResponse
from backend.services.bot_service import BotService
from backend.services.inbox_service import InboxService


router = APIRouter(prefix="/inbox", tags=["inbox"])


def get_services(request: Request) -> Tuple[BotService, InboxService]:
    bot_service: BotService = request.app.state.bot_service
    inbox_service = InboxService(bot_service)
    return bot_service, inbox_service


@router.get("/{bot_id}", response_model=InboxListResponse)
async def list_threads(bot_id: str, q: InboxFilter = Depends(), deps=Depends(get_services)) -> InboxListResponse:
    _, inbox = deps
    threads = inbox.list_threads(bot_id, q)
    return InboxListResponse(threads=threads)


__all__ = ["router"]
