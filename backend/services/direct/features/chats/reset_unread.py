"""Сброс счётчика непрочитанных при открытии чата."""

from sqlalchemy import and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.direct import DirectChat
from backend.services.direct.features.chats.lookup import bot_belongs_to_owner


class ResetUnread:
    """unread_count=0 для чата (с проверкой владельца)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, tg_chat_id: int, owner_id: int) -> bool:
        """True если хотя бы одна строка обновлена."""
        if not await bot_belongs_to_owner(self.db, bot_id, owner_id):
            return False

        stmt = (
            update(DirectChat)
            .where(and_(DirectChat.bot_id == bot_id, DirectChat.tg_chat_id == tg_chat_id))
            .values(unread_count=0)
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount > 0
