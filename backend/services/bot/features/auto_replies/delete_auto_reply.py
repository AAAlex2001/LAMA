"""Удаление AutoReply."""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot.features.auto_replies.lookup import find_auto_reply_or_404


class DeleteAutoReply:
    """Удаляет автоответ; 404 если не найден / чужой."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, auto_reply_id: int, owner_id: Optional[int] = None) -> None:
        auto_reply = await find_auto_reply_or_404(self.db, auto_reply_id, owner_id=owner_id)
        await self.db.delete(auto_reply)
        await self.db.flush()
