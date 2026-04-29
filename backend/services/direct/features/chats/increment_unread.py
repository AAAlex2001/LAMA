"""Атомарный инкремент unread_count + обновление превью последнего сообщения."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.direct import DirectChat


class IncrementUnread:
    """+1 к unread_count; обновляет updated_at, last_message_at и (опц.) превью."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        tg_chat_id: int,
        last_message_text: Optional[str] = None,
        last_message_type: Optional[str] = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        values: dict = {
            "unread_count": DirectChat.unread_count + 1,
            "updated_at": now,
            "last_message_at": now,
        }
        if last_message_text is not None:
            values["last_message_text"] = last_message_text[:200]
        if last_message_type is not None:
            values["last_message_type"] = last_message_type

        stmt = (
            update(DirectChat)
            .where(and_(DirectChat.bot_id == bot_id, DirectChat.tg_chat_id == tg_chat_id))
            .values(**values)
        )
        await self.db.execute(stmt)
        await self.db.flush()
