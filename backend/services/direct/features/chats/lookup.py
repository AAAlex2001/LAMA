"""Поиск DirectChat с проверкой владельца."""

from fastapi import HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot, MessageType
from backend.models.direct import DirectChat

# Используется в list_chats и get_chat_messages для preview не-текстовых сообщений.
TYPE_LABELS: dict[MessageType, str] = {
    MessageType.PHOTO: "Фотография",
    MessageType.VIDEO: "Видео",
    MessageType.DOCUMENT: "Документ",
    MessageType.AUDIO: "Аудио",
    MessageType.VOICE: "Голосовое",
    MessageType.ANIMATION: "GIF",
    MessageType.STICKER: "Стикер",
}


async def get_chat_and_bot(
    db: AsyncSession, bot_id: int, tg_chat_id: int, owner_id: int,
) -> tuple[DirectChat, Bot]:
    """Чат + его бот с проверкой что бот принадлежит owner_id; иначе 404."""
    query = (
        select(DirectChat, Bot)
        .join(Bot, DirectChat.bot_id == Bot.id)
        .where(
            DirectChat.bot_id == bot_id,
            DirectChat.tg_chat_id == tg_chat_id,
            Bot.owner_id == owner_id,
        )
    )
    row = (await db.execute(query)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Chat not found or access denied")
    return row[0], row[1]


async def find_chat_by_id_or_404(
    db: AsyncSession, chat_id: int, owner_id: int,
) -> DirectChat:
    """DirectChat по id с проверкой через bot.owner_id; иначе 404."""
    query = (
        select(DirectChat)
        .join(Bot, DirectChat.bot_id == Bot.id)
        .where(and_(DirectChat.id == chat_id, Bot.owner_id == owner_id))
    )
    chat = (await db.execute(query)).scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found or access denied")
    return chat


async def bot_belongs_to_owner(db: AsyncSession, bot_id: int, owner_id: int) -> bool:
    """True если бот принадлежит пользователю."""
    row = await db.execute(
        select(Bot.id).where(Bot.id == bot_id, Bot.owner_id == owner_id)
    )
    return row.scalar_one_or_none() is not None
