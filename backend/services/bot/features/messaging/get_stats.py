"""Статистика сообщений бота — одним запросом."""

from typing import Any, Dict, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotMessage
from backend.services.bot.features.crud.lookup import find_bot_or_404


class GetBotStats:
    """Агрегаты: total / incoming / outgoing / last_message_at."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, bot_id: int, owner_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        row = (await self.db.execute(
            select(
                func.count().label("total"),
                func.count().filter(BotMessage.is_incoming == True).label("incoming"),
                func.max(BotMessage.created_at).label("last_at"),
            ).where(BotMessage.bot_id == bot_id)
        )).one()

        total = row.total or 0
        incoming = row.incoming or 0
        return {
            "bot_id": bot_id,
            "total_messages": total,
            "incoming_messages": incoming,
            "outgoing_messages": total - incoming,
            "last_message_at": row.last_at,
        }
