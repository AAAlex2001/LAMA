"""История сообщений чата: загрузка + reply-preview + raw_data-обогащение."""

from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotMessage
from backend.services.direct.features.chats.enrich_chat_messages import (
    build_message_dto,
    enrich_with_raw_data,
    fetch_reply_map,
)
from backend.services.direct.features.chats.fetch_chat_messages import fetch_messages
from backend.services.direct.features.chats.lookup import bot_belongs_to_owner


class GetChatMessages:
    """Возвращает (enriched_messages, total) с поддержкой around/after навигации."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        tg_chat_id: int,
        owner_id: int,
        skip: int = 0,
        limit: int = 50,
        around_message_id: Optional[int] = None,
        after_message_id: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        if not await bot_belongs_to_owner(self.db, bot_id, owner_id):
            return [], 0

        base_filter = and_(BotMessage.bot_id == bot_id, BotMessage.chat_id == tg_chat_id)
        total = await count_messages(self.db, base_filter)

        messages = await fetch_messages(
            self.db, base_filter, skip, limit, around_message_id, after_message_id,
        )
        if not messages:
            return [], total

        reply_map = await fetch_reply_map(self.db, base_filter, messages)
        enriched = [build_message_dto(msg, reply_map) for msg in messages]
        await enrich_with_raw_data(self.db, enriched)

        return enriched, total


async def count_messages(db: AsyncSession, base_filter) -> int:
    """COUNT всех сообщений чата."""
    return (await db.execute(
        select(func.count()).where(base_filter).select_from(BotMessage)
    )).scalar() or 0
