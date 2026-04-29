"""Массовая рассылка по всем незаблокированным DM-чатам бота."""

from typing import List, Optional

from aiogram.types import Message
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotMessage, BotStatus, MessageType
from backend.models.direct import DirectChat
from backend.schemas.bots.messages import (
    BroadcastResponse,
    BroadcastResult,
    SendMessageRequest,
)
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.messaging.dispatch_telegram import dispatch_telegram
from backend.services.bot_provider import resolve_for_bot_id
from backend.utils.keyboard import build_keyboard


class BroadcastToChats:
    """Шлёт data во все DirectChat бота с is_blocked=False."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, bot_id: int, data: SendMessageRequest, owner_id: Optional[int] = None,
    ) -> BroadcastResponse:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)
        if bot.status != BotStatus.ACTIVE:
            raise HTTPException(status_code=400, detail="Bot is not active")

        chat_ids = await fetch_target_chat_ids(self.db, bot_id)
        telegram_bot = await resolve_for_bot_id(self.db, bot_id)
        reply_markup = build_keyboard(data.buttons) if data.buttons else None

        results, pending_messages = await broadcast_to_chats(
            telegram_bot, bot.id, chat_ids, data, reply_markup,
        )

        if pending_messages:
            self.db.add_all(pending_messages)
            await self.db.flush()

        sent = sum(1 for r in results if r.success)
        return BroadcastResponse(
            total=len(results),
            sent=sent,
            failed=len(results) - sent,
            results=results,
        )


async def fetch_target_chat_ids(db: AsyncSession, bot_id: int) -> List[int]:
    """tg_chat_id всех незаблокированных DM-чатов бота."""
    rows = (await db.execute(
        select(DirectChat.tg_chat_id).where(
            DirectChat.bot_id == bot_id,
            DirectChat.is_blocked == False,
        )
    )).all()
    return [row[0] for row in rows]


async def broadcast_to_chats(
    telegram_bot,
    bot_id: int,
    chat_ids: List[int],
    data: SendMessageRequest,
    reply_markup,
) -> tuple[List[BroadcastResult], List[BotMessage]]:
    """Последовательно шлёт каждому чату; возвращает результаты + накопленные BotMessage."""
    results: List[BroadcastResult] = []
    pending: List[BotMessage] = []

    for chat_id in chat_ids:
        single = build_per_chat_request(data, chat_id)
        try:
            result = await dispatch_telegram(telegram_bot, single, reply_markup)
        except Exception as exc:
            results.append(BroadcastResult(chat_id=chat_id, success=False, error=str(exc)))
            continue

        messages = result if isinstance(result, list) else [result]
        pending.extend(build_pending_for_chat(bot_id, chat_id, data, messages))
        results.append(BroadcastResult(chat_id=chat_id, success=True))

    return results, pending


def build_per_chat_request(data: SendMessageRequest, chat_id: int) -> SendMessageRequest:
    """Копия request с подставленным chat_id."""
    return SendMessageRequest(
        chat_id=chat_id,
        text_content=data.text_content,
        media_url=data.media_url,
        media_urls=data.media_urls,
        media_type=data.media_type,
        buttons=data.buttons,
    )


def build_pending_for_chat(
    bot_id: int, chat_id: int, data: SendMessageRequest, messages: List[Message],
) -> List[BotMessage]:
    """BotMessage[] для всех ответов TG; calendar_source=AUTOMATION_BROADCAST в raw_data."""
    out: List[BotMessage] = []
    for msg in messages:
        file_id = msg.photo[-1].file_id if msg.photo else None
        raw_data = msg.model_dump(mode="json")
        raw_data["calendar_source"] = "AUTOMATION_BROADCAST"
        out.append(BotMessage(
            bot_id=bot_id,
            telegram_message_id=msg.message_id,
            chat_id=chat_id,
            user_id=None,
            message_type=data.media_type or MessageType.TEXT,
            text_content=data.text_content,
            media_file_id=file_id,
            media_url=data.media_url,
            is_incoming=False,
            raw_data=raw_data,
        ))
    return out
