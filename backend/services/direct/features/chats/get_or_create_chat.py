"""Получить существующий DirectChat или создать новый; обновить устаревшие поля."""

from typing import Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.direct import DirectChat


class GetOrCreateChat:
    """Идемпотентная операция: один чат на (bot_id, tg_chat_id)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        tg_chat_id: int,
        tg_user_id: Optional[int] = None,
        tg_username: Optional[str] = None,
        tg_first_name: Optional[str] = None,
        tg_last_name: Optional[str] = None,
        tg_photo_url: Optional[str] = None,
    ) -> DirectChat:
        existing = await find_existing(self.db, bot_id, tg_chat_id)
        if existing:
            await refresh_user_fields(
                self.db, existing,
                tg_username=tg_username,
                tg_first_name=tg_first_name,
                tg_last_name=tg_last_name,
                tg_photo_url=tg_photo_url,
            )
            return existing

        chat = DirectChat(
            bot_id=bot_id,
            tg_chat_id=tg_chat_id,
            tg_user_id=tg_user_id,
            tg_username=tg_username,
            tg_first_name=tg_first_name,
            tg_last_name=tg_last_name,
            tg_photo_url=tg_photo_url,
        )
        self.db.add(chat)
        await self.db.flush()
        await self.db.refresh(chat)
        return chat


async def find_existing(
    db: AsyncSession, bot_id: int, tg_chat_id: int,
) -> Optional[DirectChat]:
    """SELECT по (bot_id, tg_chat_id); None если не найден."""
    query = select(DirectChat).where(
        and_(DirectChat.bot_id == bot_id, DirectChat.tg_chat_id == tg_chat_id)
    )
    return (await db.execute(query)).scalar_one_or_none()


async def refresh_user_fields(
    db: AsyncSession,
    chat: DirectChat,
    tg_username: Optional[str],
    tg_first_name: Optional[str],
    tg_last_name: Optional[str],
    tg_photo_url: Optional[str],
) -> None:
    """Обновляет поля только если новое значение != текущему. Flush только при изменениях."""
    needs_update = False

    if tg_username and chat.tg_username != tg_username:
        chat.tg_username = tg_username
        needs_update = True
    if tg_first_name and chat.tg_first_name != tg_first_name:
        chat.tg_first_name = tg_first_name
        needs_update = True
    if tg_last_name and chat.tg_last_name != tg_last_name:
        chat.tg_last_name = tg_last_name
        needs_update = True
    if tg_photo_url and chat.tg_photo_url != tg_photo_url:
        chat.tg_photo_url = tg_photo_url
        needs_update = True

    if needs_update:
        await db.flush()
        await db.refresh(chat)
