"""Обновление tg_photo_url DirectChat (для синхронизации аватарки из webhook)."""

from sqlalchemy import and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.direct import DirectChat


class UpdatePhoto:
    """Простой UPDATE tg_photo_url по (bot_id, tg_chat_id)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, tg_chat_id: int, photo_url: str) -> None:
        stmt = (
            update(DirectChat)
            .where(and_(DirectChat.bot_id == bot_id, DirectChat.tg_chat_id == tg_chat_id))
            .values(tg_photo_url=photo_url)
        )
        await self.db.execute(stmt)
