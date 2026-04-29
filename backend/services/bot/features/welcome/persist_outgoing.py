"""Запись welcome-сообщения в DM-историю BotMessage (только для DM, chat_id > 0)."""

from typing import Optional

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, MessageType
from backend.services.direct.features.messages.save_outgoing_message import SaveOutgoingMessage


async def persist_outgoing_in_dm(
    db: AsyncSession,
    bot_model: BotModel,
    chat_id: int,
    message: Optional[Message],
) -> None:
    """No-op для groups (chat_id <= 0) или если TG не вернул message."""
    if not message or chat_id <= 0:
        return
    await SaveOutgoingMessage(db).execute(
        bot_id=bot_model.id,
        tg_chat_id=chat_id,
        tg_message=message,
        fallback_type=bot_model.welcome_media_type or MessageType.TEXT,
        fallback_media_url=bot_model.welcome_media_url,
    )
    await db.flush()
