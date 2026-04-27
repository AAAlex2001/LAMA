"""Постраничный список DirectChat с превью последнего сообщения и инфой о боте."""

from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot, MessageType
from backend.models.direct import DirectChat
from backend.services.direct.features.chats.lookup import TYPE_LABELS


class ListChats:
    """Чаты пользователя + total. Сортировка new/old, фильтры по unread и bot_id."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        skip: int = 0,
        limit: int = 50,
        bot_id: Optional[int] = None,
        sort: str = "new",
        unread_filter: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        filters = build_filters(owner_id, bot_id, unread_filter)

        total = await count_chats(self.db, filters)
        rows = await fetch_chat_rows(self.db, filters, sort, skip, limit)

        return [build_chat_dto(row) for row in rows], total


def build_filters(
    owner_id: int, bot_id: Optional[int], unread_filter: Optional[str],
) -> list:
    """Базовые WHERE-условия для запроса чатов."""
    filters = [Bot.owner_id == owner_id]
    if bot_id:
        filters.append(DirectChat.bot_id == bot_id)
    if unread_filter == "unread":
        filters.append(DirectChat.unread_count > 0)
    elif unread_filter == "read":
        filters.append(DirectChat.unread_count == 0)
    return filters


async def count_chats(db: AsyncSession, filters: list) -> int:
    """COUNT с теми же фильтрами; через subquery, чтобы не дублировать JOIN."""
    sub = (
        select(DirectChat.id)
        .join(Bot, DirectChat.bot_id == Bot.id)
        .where(and_(*filters))
        .subquery()
    )
    return (await db.execute(select(func.count()).select_from(sub))).scalar() or 0


async def fetch_chat_rows(
    db: AsyncSession, filters: list, sort: str, skip: int, limit: int,
) -> list:
    """Страница чатов с подгрузкой username/first_name бота — один запрос."""
    query = (
        select(
            DirectChat,
            Bot.username.label("_bot_username"),
            Bot.first_name.label("_bot_first_name"),
        )
        .join(Bot, DirectChat.bot_id == Bot.id)
        .where(and_(*filters))
        .order_by(
            desc(DirectChat.is_pinned),
            asc(DirectChat.updated_at) if sort == "old" else desc(DirectChat.updated_at),
        )
        .offset(skip)
        .limit(limit)
    )
    return list((await db.execute(query)).all())


def build_chat_dto(row) -> Dict[str, Any]:
    """ORM → dict для DirectChatListResponse."""
    chat = row[0]
    return {
        "id": chat.id,
        "bot_id": chat.bot_id,
        "tg_chat_id": chat.tg_chat_id,
        "tg_user_id": chat.tg_user_id,
        "tg_username": chat.tg_username,
        "tg_first_name": chat.tg_first_name,
        "tg_last_name": chat.tg_last_name,
        "tg_photo_url": chat.tg_photo_url,
        "unread_count": chat.unread_count,
        "is_pinned": chat.is_pinned,
        "is_blocked": chat.is_blocked,
        "created_at": chat.created_at,
        "updated_at": chat.updated_at,
        "bot_username": row[1],
        "bot_first_name": row[2],
        "last_message_preview": format_preview(chat.last_message_text, chat.last_message_type, chat.last_message_at),
        "last_message_at": chat.last_message_at,
    }


def format_preview(
    text: Optional[str], msg_type: Optional[MessageType], last_at,
) -> Optional[str]:
    """Текст для текстовых; локализованный лейбл типа для медиа; None если сообщений не было."""
    if last_at is None:
        return None
    if msg_type == MessageType.TEXT or msg_type is None:
        return text
    return TYPE_LABELS.get(msg_type, "Медиа")
