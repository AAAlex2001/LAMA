"""Обновление превью последнего сообщения (для исходящих — без инкремента непрочитанных)."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.direct import DirectChat


class UpdateLastMessage:
    """То же что IncrementUnread, но без unread_count++ (для исходящих сообщений)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        tg_chat_id: int,
        text: Optional[str],
        message_type: Optional[str],
    ) -> None:
        now = datetime.now(timezone.utc)
        values: dict = {"updated_at": now, "last_message_at": now}
        if text is not None:
            values["last_message_text"] = text[:200]
        if message_type is not None:
            values["last_message_type"] = message_type

        stmt = (
            update(DirectChat)
            .where(and_(DirectChat.bot_id == bot_id, DirectChat.tg_chat_id == tg_chat_id))
            .values(**values)
        )
        await self.db.execute(stmt)
        await self.db.flush()
