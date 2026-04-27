"""Удаление исходящего сообщения из TG + БД + WS-broadcast."""

import logging
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot_provider import resolve_by_token
from backend.services.direct.features.messages.edit_message import find_outgoing_message_or_404
from backend.websockets.manager import ws_manager

logger = logging.getLogger(__name__)


class DeleteMessage:
    """Удаляет в TG → удаляет BotMessage из БД → шлёт WS-событие."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        message_id: int,
        owner_id: int,
        bot_id: Optional[int] = None,
        tg_chat_id: Optional[int] = None,
    ) -> bool:
        msg, bot = await find_outgoing_message_or_404(
            self.db, message_id, owner_id, bot_id, tg_chat_id,
        )

        try:
            client = resolve_by_token(bot.token)
            await client.delete_message(chat_id=msg.chat_id, message_id=msg.telegram_message_id)
        except Exception as exc:
            logger.error("Error deleting message via Direct API: %s", exc, exc_info=True)
            raise HTTPException(status_code=400, detail="Failed to delete message")

        deleted_chat_id = msg.chat_id
        deleted_bot_id = msg.bot_id
        deleted_id = msg.id

        await self.db.delete(msg)
        await self.db.flush()

        await ws_manager.broadcast_chat_update(
            user_id=owner_id, bot_id=deleted_bot_id, chat_id=deleted_chat_id,
            event_type="message_deleted", payload={"message_id": deleted_id},
        )
        return True
