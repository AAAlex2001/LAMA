"""Главный use-case отправки сообщения от лица бота в DM."""

import logging
from typing import List

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotMessage, MessageType
from backend.schemas.bots.messages import SendMessageRequest
from backend.services.bot_provider import resolve_by_token
from backend.services.direct.features.chats.lookup import get_chat_and_bot
from backend.services.direct.features.chats.update_last_message import UpdateLastMessage
from backend.services.direct.features.messages.broadcast import broadcast_new_message
from backend.services.direct.features.messages.save_outgoing_message import SaveOutgoingMessage
from backend.services.direct.features.messages.send_to_telegram import send_to_telegram
from backend.services.direct.features.utils.media_detectors import detect_media_type
from backend.services.direct.features.utils.request_media import get_request_media_urls
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)


class SendMessage:
    """Шлёт сообщение в TG, сохраняет в БД, обновляет превью чата, шлёт WS-событие."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, bot_id: int, tg_chat_id: int, owner_id: int, request: SendMessageRequest,
    ) -> List[BotMessage]:
        chat, bot = await get_chat_and_bot(self.db, bot_id, tg_chat_id, owner_id)

        media_urls = get_request_media_urls(request)
        reply_params = build_reply_params(request)
        reply_markup = build_keyboard(request.buttons) if request.buttons else None

        try:
            client = resolve_by_token(bot.token)
            tg_responses = await send_to_telegram(
                client, tg_chat_id, request, media_urls, reply_markup, reply_params,
            )
        except Exception as exc:
            logger.error("Error sending message via Direct API: %s", exc, exc_info=True)
            return []

        if not tg_responses:
            return []

        saved = await save_all_responses(
            self.db, bot.id, tg_chat_id, tg_responses, request, media_urls,
        )

        await self.db.flush()
        for msg in saved:
            await self.db.refresh(msg)

        await update_chat_preview(self.db, bot_id, tg_chat_id, saved[-1])
        await broadcast_new_message(owner_id, bot_id, tg_chat_id, saved[-1].id)

        return saved


def build_reply_params(request: SendMessageRequest) -> dict:
    """{'reply_to_message_id': X} или пустой dict."""
    if request.reply_to_message_id:
        return {"reply_to_message_id": request.reply_to_message_id}
    return {}


async def save_all_responses(
    db: AsyncSession,
    bot_id: int,
    tg_chat_id: int,
    tg_responses: List[Message],
    request: SendMessageRequest,
    media_urls: List[str],
) -> List[BotMessage]:
    """Для каждого ответа TG создаёт BotMessage с правильным fallback_type/url."""
    fallback_urls = media_urls[:10] if len(media_urls) > 1 else media_urls
    saver = SaveOutgoingMessage(db)
    saved: List[BotMessage] = []

    for index, tg_response in enumerate(tg_responses):
        fallback_url = fallback_urls[index] if index < len(fallback_urls) else None
        fallback_type = pick_fallback_type(request, fallback_url)
        msg = await saver.execute(
            bot_id=bot_id,
            tg_chat_id=tg_chat_id,
            tg_message=tg_response,
            fallback_type=fallback_type,
            fallback_media_url=fallback_url,
            reply_to_message_id=request.reply_to_message_id if index == 0 else None,
        )
        saved.append(msg)
    return saved


def pick_fallback_type(request: SendMessageRequest, fallback_url: str | None) -> MessageType:
    """request.media_type → detect по URL → TEXT."""
    if request.media_type:
        return request.media_type
    if fallback_url:
        return detect_media_type(fallback_url)
    return MessageType.TEXT


async def update_chat_preview(
    db: AsyncSession, bot_id: int, tg_chat_id: int, last_message: BotMessage,
) -> None:
    """Обновляет last_message_text/type и updated_at чата."""
    await UpdateLastMessage(db).execute(
        bot_id=bot_id,
        tg_chat_id=tg_chat_id,
        text=last_message.text_content,
        message_type=last_message.message_type,
    )
