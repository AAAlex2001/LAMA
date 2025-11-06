"""
InboxService — выборки истории переписки из БД (без in-memory).
"""

from __future__ import annotations

from typing import List
from datetime import datetime

from backend.models.inbox import InboxThread, InboxMessage, InboxFilter
from backend.services.bot_service import BotService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from backend.models.db_models import BotInboxMessage as BotInboxMessageORM


class InboxService:
    def __init__(self, bot_service: BotService, session_factory: async_sessionmaker[AsyncSession]):
        self.bot_service = bot_service
        self.session_factory = session_factory

    async def list_threads(self, bot_id: str, flt: InboxFilter) -> List[InboxThread]:
        await self.bot_service.require(bot_id)
        async with self.session_factory() as session:
            q = select(BotInboxMessageORM).where(BotInboxMessageORM.bot_id == bot_id)
            if flt.user_id is not None:
                q = q.where(BotInboxMessageORM.user_id == flt.user_id)
            res = await session.execute(q)
            rows = res.scalars().all()
            bucket: dict[int, List[BotInboxMessageORM]] = {}
            for r in rows:
                if flt.from_ts and r.ts < flt.from_ts:
                    continue
                if flt.to_ts and r.ts > flt.to_ts:
                    continue
                if flt.query and flt.query.lower() not in (r.text or "").lower():
                    continue
                bucket.setdefault(r.user_id, []).append(r)
            threads: List[InboxThread] = []
            for user_id, msgs in bucket.items():
                msgs.sort(key=lambda m: m.ts)
                threads.append(
                    InboxThread(
                        bot_id=bot_id,
                        user_id=user_id,
                        messages=[InboxMessage(user_id=user_id, direction=m.direction, text=m.text, ts=m.ts) for m in msgs],
                    )
                )
            return threads


__all__ = ["InboxService"]
