"""Persist outgoing trigger messages for direct chats."""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import MessageType
from backend.services.direct.features.messages.save_outgoing_message import SaveOutgoingMessage

logger = logging.getLogger(__name__)


async def save_trigger_message(
    db: AsyncSession,
    data: dict,
    chat_id: int,
    tg_message,
    fallback_type: MessageType,
    fallback_media_url: Optional[str],
) -> None:
    """Save outgoing trigger message only for DM chats."""
    if not tg_message or chat_id <= 0:
        return
    bot_id = data.get("_bot_id")
    if not bot_id:
        return
    try:
        await SaveOutgoingMessage(db).execute(
            bot_id=bot_id,
            tg_chat_id=chat_id,
            tg_message=tg_message,
            fallback_type=fallback_type,
            fallback_media_url=fallback_media_url,
        )
        await db.flush()
    except Exception as exc:
        logger.error("Failed to save trigger message in BotMessage: %s", exc, exc_info=True)