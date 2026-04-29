"""Обогащение списка сообщений: reply-preview + raw_data (media_group/name/size)."""

from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotMessage
from backend.services.direct.features.chats.lookup import TYPE_LABELS


async def fetch_reply_map(
    db: AsyncSession, base_filter, messages: List[BotMessage],
) -> Dict[int, Dict[str, Any]]:
    """Превью для reply_to_message_id (text/media_url/type/is_post). Пусто если reply нет."""
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
    """ORM → dict для ChatHistoryResponse, с reply-preview-полями."""
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
