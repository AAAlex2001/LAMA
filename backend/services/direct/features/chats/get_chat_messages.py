"""История сообщений чата. Поддерживает обычную страницу, around_message и after_message."""

from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import defer

from backend.models.bots import BotMessage
from backend.services.direct.features.chats.lookup import TYPE_LABELS, bot_belongs_to_owner


class GetChatMessages:
    """История сообщений с reply-preview и raw_data-обогащением (media_group/name/size)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        tg_chat_id: int,
        owner_id: int,
        skip: int = 0,
        limit: int = 50,
        around_message_id: Optional[int] = None,
        after_message_id: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        if not await bot_belongs_to_owner(self.db, bot_id, owner_id):
            return [], 0

        base_filter = and_(BotMessage.bot_id == bot_id, BotMessage.chat_id == tg_chat_id)
        total = await count_messages(self.db, base_filter)

        messages = await fetch_messages(
            self.db, base_filter, skip, limit, around_message_id, after_message_id,
        )
        if not messages:
            return [], total

        reply_map = await fetch_reply_map(self.db, base_filter, messages)
        enriched = [build_message_dto(msg, reply_map) for msg in messages]
        await enrich_with_raw_data(self.db, enriched)

        return enriched, total


async def count_messages(db: AsyncSession, base_filter) -> int:
    """COUNT всех сообщений чата."""
    return (await db.execute(
        select(func.count()).where(base_filter).select_from(BotMessage)
    )).scalar() or 0


async def fetch_messages(
    db: AsyncSession,
    base_filter,
    skip: int,
    limit: int,
    around_message_id: Optional[int],
    after_message_id: Optional[int],
) -> List[BotMessage]:
    """Маршрутизация по режиму: around / after / normal."""
    if after_message_id:
        return await fetch_messages_after(db, base_filter, after_message_id, skip, limit)
    if around_message_id:
        return await fetch_messages_around(db, base_filter, around_message_id, skip, limit)
    return await fetch_messages_normal(db, base_filter, skip, limit)


async def fetch_messages_normal(
    db: AsyncSession, base_filter, skip: int, limit: int,
) -> List[BotMessage]:
    """Обычная пагинация по created_at desc."""
    query = (
        base_message_query(base_filter)
        .order_by(desc(BotMessage.created_at))
        .offset(skip)
        .limit(limit)
    )
    return list((await db.execute(query)).scalars().all())


async def fetch_messages_after(
    db: AsyncSession, base_filter, after_message_id: int, skip: int, limit: int,
) -> List[BotMessage]:
    """Только сообщения новее указанного telegram_message_id (для real-time подгрузки)."""
    target_id = await find_target_id(db, base_filter, after_message_id)
    if target_id is None:
        return await fetch_messages_normal(db, base_filter, skip, limit)

    query = (
        base_message_query(base_filter)
        .where(BotMessage.id > target_id)
        .order_by(desc(BotMessage.created_at))
        .limit(limit)
    )
    return list((await db.execute(query)).scalars().all())


async def fetch_messages_around(
    db: AsyncSession, base_filter, around_message_id: int, skip: int, limit: int,
) -> List[BotMessage]:
    """Окно из half до и half после указанного сообщения (для перехода по ссылке reply)."""
    target_id = await find_target_id(db, base_filter, around_message_id)
    if target_id is None:
        return await fetch_messages_normal(db, base_filter, skip, limit)

    half = limit // 2
    before_query = (
        base_message_query(base_filter)
        .where(BotMessage.id <= target_id)
        .order_by(desc(BotMessage.id))
        .limit(half + 1)
    )
    after_query = (
        base_message_query(base_filter)
        .where(BotMessage.id > target_id)
        .order_by(asc(BotMessage.id))
        .limit(half)
    )
    before = list((await db.execute(before_query)).scalars().all())
    after = list((await db.execute(after_query)).scalars().all())
    after.reverse()
    return after + before


async def find_target_id(
    db: AsyncSession, base_filter, telegram_message_id: int,
) -> Optional[int]:
    """Внутренний BotMessage.id по telegram_message_id; None если не найден."""
    return (await db.execute(
        select(BotMessage.id).where(
            base_filter, BotMessage.telegram_message_id == telegram_message_id,
        )
    )).scalar_one_or_none()


def base_message_query(base_filter):
    """SELECT BotMessage без raw_data (для скорости)."""
    return select(BotMessage).where(base_filter).options(defer(BotMessage.raw_data))


# ──────────────────────────────────────────────────────────────────────
# Обогащение: reply-preview + raw_data
# ──────────────────────────────────────────────────────────────────────


async def fetch_reply_map(
    db: AsyncSession, base_filter, messages: List[BotMessage],
) -> Dict[int, Dict[str, Any]]:
    """Превью для reply_to_message_id (text/media_url/type/is_post)."""
    reply_ids = [m.reply_to_message_id for m in messages if m.reply_to_message_id]
    if not reply_ids:
        return {}

    query = select(
        BotMessage.telegram_message_id,
        BotMessage.text_content,
        BotMessage.message_type,
        BotMessage.media_url,
        BotMessage.is_system,
    ).where(base_filter, BotMessage.telegram_message_id.in_(reply_ids))

    rows = (await db.execute(query)).all()
    return {
        tg_msg_id: {
            "text": (text[:200] if text else TYPE_LABELS.get(msg_type, "Медиа")),
            "media_url": media_url if is_sys else None,
            "message_type": msg_type.value if msg_type else None,
            "is_post": is_sys or False,
        }
        for tg_msg_id, text, msg_type, media_url, is_sys in rows
    }


def build_message_dto(
    msg: BotMessage, reply_map: Dict[int, Dict[str, Any]],
) -> Dict[str, Any]:
    """ORM → dict для ChatHistoryResponse, с reply-preview."""
    reply_data = reply_map.get(msg.reply_to_message_id) if msg.reply_to_message_id else None
    return {
        "id": msg.id,
        "bot_id": msg.bot_id,
        "telegram_message_id": msg.telegram_message_id,
        "chat_id": msg.chat_id,
        "user_id": msg.user_id,
        "message_type": msg.message_type,
        "text_content": msg.text_content,
        "media_file_id": msg.media_file_id,
        "media_url": msg.media_url,
        "reply_to_message_id": msg.reply_to_message_id,
        "is_incoming": msg.is_incoming,
        "is_system": msg.is_system,
        "created_at": msg.created_at,
        "media_group_id": None,
        "media_name": None,
        "media_size": None,
        "reply_message_text": reply_data["text"] if reply_data else None,
        "reply_media_url": reply_data["media_url"] if reply_data else None,
        "reply_message_type": reply_data["message_type"] if reply_data else None,
        "reply_is_post": reply_data["is_post"] if reply_data else False,
    }


async def enrich_with_raw_data(
    db: AsyncSession, enriched: List[Dict[str, Any]],
) -> None:
    """Дополняет media_group_id/media_name/media_size из raw_data; мутирует enriched."""
    if not enriched:
        return

    msg_ids = [d["id"] for d in enriched]
    rows = (await db.execute(
        select(BotMessage.id, BotMessage.raw_data).where(
            BotMessage.id.in_(msg_ids), BotMessage.raw_data.isnot(None),
        )
    )).all()
    raw_map: Dict[int, dict] = {row[0]: row[1] for row in rows if row[1]}

    for data in enriched:
        raw = raw_map.get(data["id"])
        if not raw:
            continue
        if raw.get("media_group_id"):
            data["media_group_id"] = str(raw["media_group_id"])
        data["media_name"] = pick_media_name(raw)
        data["media_size"] = pick_media_size(raw)


def pick_media_name(raw: dict) -> Optional[str]:
    """document.file_name → audio.file_name/title → voice synthetic name."""
    doc = raw.get("document") or {}
    if doc.get("file_name"):
        return str(doc["file_name"])
    audio = raw.get("audio") or {}
    if audio:
        return str(audio.get("file_name") or audio.get("title") or "")
    voice = raw.get("voice") or {}
    if voice.get("file_unique_id"):
        return f"voice_{voice['file_unique_id']}"
    return None


def pick_media_size(raw: dict) -> Optional[int]:
    """file_size первого попавшегося медиа-поля."""
    for key in ("document", "audio", "voice", "video", "animation"):
        media = raw.get(key) or {}
        size = media.get("file_size")
        if size is not None:
            return int(size)
    return None
