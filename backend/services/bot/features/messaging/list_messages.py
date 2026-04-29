"""Список сообщений бота с фильтрами + total."""

from typing import List, Optional, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotMessage


class ListBotMessages:
    """Постраничный список BotMessage."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        chat_id: Optional[int] = None,
        is_incoming: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[BotMessage], int]:
        query = build_filtered_query(bot_id, chat_id, is_incoming)

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar() or 0

        rows = (await self.db.execute(
            query.order_by(desc(BotMessage.created_at)).offset(skip).limit(limit)
        )).scalars().all()
        return list(rows), total


def build_filtered_query(bot_id: int, chat_id: Optional[int], is_incoming: Optional[bool]):
    """SELECT BotMessage с применёнными фильтрами; без сортировки/limit."""
    query = select(BotMessage).where(BotMessage.bot_id == bot_id)
    if chat_id is not None:
        query = query.where(BotMessage.chat_id == chat_id)
    if is_incoming is not None:
        query = query.where(BotMessage.is_incoming == is_incoming)
    return query
