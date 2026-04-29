"""Редактирование исходящего сообщения в TG + БД + WS-broadcast."""

import logging
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot, BotMessage, MessageType
from backend.schemas.direct.message import EditMessageRequest
from backend.services.bot_provider import resolve_by_token
from backend.websockets.manager import ws_manager

logger = logging.getLogger(__name__)


class EditMessage:
    """Редактирует текст/caption в TG, апдейтит BotMessage, шлёт WS-событие."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        message_id: int,
        owner_id: int,
        request: EditMessageRequest,
        bot_id: Optional[int] = None,
        tg_chat_id: Optional[int] = None,
    ) -> Optional[BotMessage]:
        msg, bot = await find_outgoing_message_or_404(
            self.db, message_id, owner_id, bot_id, tg_chat_id,
        )

        if not request.text_content:
            return msg

        try:
            client = resolve_by_token(bot.token)
            await edit_in_telegram(client, msg, request.text_content)
        except Exception as exc:
            logger.error("Error editing message via Direct API: %s", exc, exc_info=True)
            raise HTTPException(status_code=400, detail="Failed to edit message")

        msg.text_content = request.text_content
        await self.db.flush()
        await self.db.refresh(msg)

        await ws_manager.broadcast_chat_update(
            user_id=owner_id, bot_id=msg.bot_id, chat_id=msg.chat_id,
            event_type="message_edited", payload={"message_id": msg.id},
        )
        return msg


async def find_outgoing_message_or_404(
    db: AsyncSession,
    message_id: int,
    owner_id: int,
    bot_id: Optional[int],
    tg_chat_id: Optional[int],
) -> tuple[BotMessage, Bot]:
    """Сообщение + бот по id; только исходящее (is_incoming=False); 404 иначе."""
    filters = [
        BotMessage.id == message_id,
        Bot.owner_id == owner_id,
        BotMessage.is_incoming == False,
    ]
    if bot_id is not None:
        filters.append(BotMessage.bot_id == bot_id)
    if tg_chat_id is not None:
        filters.append(BotMessage.chat_id == tg_chat_id)

    query = select(BotMessage, Bot).join(Bot, BotMessage.bot_id == Bot.id).where(and_(*filters))
    row = (await db.execute(query)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Message not found or access denied")
    return row[0], row[1]


async def edit_in_telegram(client, msg: BotMessage, new_text: str) -> None:
    """edit_message_text для TEXT, edit_message_caption для медиа."""
    if msg.message_type == MessageType.TEXT:
        await client.edit_message_text(
            text=new_text, chat_id=msg.chat_id, message_id=msg.telegram_message_id,
        )
    else:
        await client.edit_message_caption(
            caption=new_text, chat_id=msg.chat_id, message_id=msg.telegram_message_id,
        )
