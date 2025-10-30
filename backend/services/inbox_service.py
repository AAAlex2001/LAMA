"""
InboxService — тонкая обёртка над BotService для выборок истории переписки.
"""

from __future__ import annotations

from typing import List
from datetime import datetime

from backend.models.inbox import InboxThread, InboxMessage, InboxFilter
from backend.services.bot_service import BotService


class InboxService:
    def __init__(self, bot_service: BotService):
        self.bot_service = bot_service

    def list_threads(self, bot_id: str, flt: InboxFilter) -> List[InboxThread]:
        record = self.bot_service.require(bot_id)
        threads: List[InboxThread] = []
        for user_id, msgs in record.inbox.items():
            if flt.user_id and user_id != flt.user_id:
                continue
            filtered: List[InboxMessage] = []
            for m in msgs:
                ts: datetime = m["ts"]
                if flt.from_ts and ts < flt.from_ts:
                    continue
                if flt.to_ts and ts > flt.to_ts:
                    continue
                if flt.query and flt.query.lower() not in (m["text"] or "").lower():
                    continue
                filtered.append(InboxMessage(user_id=user_id, direction=m["direction"], text=m["text"], ts=ts))
            if not filtered:
                continue
            threads.append(InboxThread(bot_id=bot_id, user_id=user_id, messages=filtered))
        return threads


__all__ = ["InboxService"]
