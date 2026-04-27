"""Сохранение входящего сообщения в BotMessage (вызывается из вебхука)."""

from typing import Optional

from aiogram.types import Message
from fastapi import HTTPException

from backend.models.bots import Bot, BotMessage
from backend.services.direct.features.utils.media_detectors import extract_incoming_media
from backend.services.direct.features.utils.message_extractors import (
    extract_nested_id,
    get_raw_message_data,
    message_get,
)
from sqlalchemy.ext.asyncio import AsyncSession


class SaveIncomingMessage:
    """Принимает aiogram Message или dict из вебхука и сохраняет в БД."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, bot_id: int, message: Message | dict) -> Optional[BotMessage]:
        bot = await self.db.get(Bot, bot_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")

        raw_data = get_raw_message_data(message)
        chat_id = pick_chat_id(message, raw_data)
        user_id = pick_user_id(message, raw_data)
        message_id = message_get(message, "message_id") or raw_data.get("message_id")
        text = message_get(message, "text") or message_get(message, "caption")

        msg_type, media_file_id = extract_incoming_media(message)
        reply_to_msg_id = pick_reply_to_id(message, raw_data)

        msg = BotMessage(
            bot_id=bot_id,
            telegram_message_id=message_id,
            chat_id=chat_id,
            user_id=user_id,
            message_type=msg_type,
            text_content=text,
            media_file_id=media_file_id,
            media_url=None,
            is_incoming=True,
            raw_data=raw_data,
            reply_to_message_id=reply_to_msg_id,
        )
        self.db.add(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg


def pick_chat_id(message, raw_data: dict) -> Optional[int]:
    """chat.id из объекта или из raw_data."""
    chat = message_get(message, "chat") or {}
    return extract_nested_id(chat) or extract_nested_id(raw_data.get("chat"))


def pick_user_id(message, raw_data: dict) -> Optional[int]:
    """from_user.id с fallback на 'from' и 'from_user' в raw_data."""
    from_user = message_get(message, "from_user")
    if from_user is None:
        from_user = message_get(message, "from") or raw_data.get("from") or raw_data.get("from_user") or {}
    return (
        extract_nested_id(from_user)
        or extract_nested_id(raw_data.get("from"))
        or extract_nested_id(raw_data.get("from_user"))
    )


def pick_reply_to_id(message, raw_data: dict) -> Optional[int]:
    """reply_to_message.message_id; None если поля нет."""
    reply_to = message_get(message, "reply_to_message") or raw_data.get("reply_to_message")
    if not reply_to:
        return None
    return extract_nested_id(reply_to, "message_id")
