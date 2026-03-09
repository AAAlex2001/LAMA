from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram.types import Message
from aiogram.exceptions import TelegramAPIError

from backend.models.bots import Bot as BotModel, BotMessage, BotStatus, MessageType
from backend.models.direct import DirectChat
from backend.schemas.bots.messages import SendMessageRequest, BroadcastResult, BroadcastResponse
from backend.services.bot_provider import resolve_for_bot_id
from backend.utils.keyboard import build_keyboard

MEDIA_SEND_METHODS = {
    MessageType.PHOTO: "send_photo",
    MessageType.VIDEO: "send_video",
    MessageType.DOCUMENT: "send_document",
}


class BotMessagingService:
    """Отправка, хранение и статистика сообщений бота."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def send(
        self, bot_id: int, data: SendMessageRequest,
        owner_id: Optional[int] = None,
    ) -> Message:
        """Отправить сообщение от имени бота."""
        bot = await self.get_bot_or_raise(bot_id, owner_id)
        if bot.status != BotStatus.ACTIVE:
            raise ValueError("Bot is not active")

        telegram_bot = await resolve_for_bot_id(self.db, bot_id)
        reply_markup = build_keyboard(data.buttons) if data.buttons else None

        try:
            message = await self.dispatch_telegram(telegram_bot, data, reply_markup)
        except TelegramAPIError as e:
            raise ValueError(f"Failed to send message: {e}")

        file_id = message.photo[-1].file_id if message.photo else None
        await self.save(
            bot_id=bot.id,
            telegram_message_id=message.message_id,
            chat_id=data.chat_id,
            user_id=None,
            message_type=data.media_type or MessageType.TEXT,
            text_content=data.text_content,
            media_file_id=file_id,
            media_url=data.media_url,
            is_incoming=False,
            raw_data=message.model_dump(mode="json"),
            reply_to_message_id=data.reply_to_message_id,
        )
        return message

    async def dispatch_telegram(self, telegram_bot, data: SendMessageRequest, reply_markup) -> Message:
        """Отправить сообщение в Telegram по типу медиа."""
        reply_params = {}
        if data.reply_to_message_id:
            reply_params["reply_to_message_id"] = data.reply_to_message_id

        if data.media_url and data.media_type and data.media_type in MEDIA_SEND_METHODS:
            method = getattr(telegram_bot, MEDIA_SEND_METHODS[data.media_type])
            return await method(
                chat_id=data.chat_id,
                **{data.media_type.value.lower(): data.media_url},
                caption=data.text_content,
                reply_markup=reply_markup,
                **reply_params,
            )
        return await telegram_bot.send_message(
            chat_id=data.chat_id,
            text=data.text_content or "No content",
            reply_markup=reply_markup,
            **reply_params,
        )

    async def save(
        self, bot_id: int, telegram_message_id: int, chat_id: int,
        user_id: Optional[int], message_type: MessageType,
        text_content: Optional[str], media_file_id: Optional[str],
        media_url: Optional[str], is_incoming: bool,
        raw_data: Optional[Dict[str, Any]],
        reply_to_message_id: Optional[int] = None,
    ) -> BotMessage:
        """Сохранить сообщение в БД."""
        msg = BotMessage(
            bot_id=bot_id, telegram_message_id=telegram_message_id,
            chat_id=chat_id, user_id=user_id, message_type=message_type,
            text_content=text_content, media_file_id=media_file_id,
            media_url=media_url, is_incoming=is_incoming, raw_data=raw_data,
            reply_to_message_id=reply_to_message_id,
        )
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)
        return msg

    async def get_list(
        self, bot_id: int,
        chat_id: Optional[int] = None,
        is_incoming: Optional[bool] = None,
        skip: int = 0, limit: int = 50,
    ) -> Tuple[List[BotMessage], int]:
        """Получить список сообщений бота."""
        query = select(BotMessage).where(BotMessage.bot_id == bot_id)
        if chat_id is not None:
            query = query.where(BotMessage.chat_id == chat_id)
        if is_incoming is not None:
            query = query.where(BotMessage.is_incoming == is_incoming)

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar() or 0

        result = await self.db.execute(
            query.order_by(desc(BotMessage.created_at)).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def get_stats(self, bot_id: int, owner_id: Optional[int] = None) -> Dict[str, Any]:
        """Получить статистику сообщений бота."""
        await self.get_bot_or_raise(bot_id, owner_id)

        total = (await self.db.execute(
            select(func.count()).where(BotMessage.bot_id == bot_id)
        )).scalar() or 0

        incoming = (await self.db.execute(
            select(func.count()).where(
                BotMessage.bot_id == bot_id,
                BotMessage.is_incoming == True,
            )
        )).scalar() or 0

        last_at = (await self.db.execute(
            select(BotMessage.created_at)
            .where(BotMessage.bot_id == bot_id)
            .order_by(desc(BotMessage.created_at))
            .limit(1)
        )).scalar_one_or_none()

        return {
            "bot_id": bot_id,
            "total_messages": total,
            "incoming_messages": incoming,
            "outgoing_messages": total - incoming,
            "last_message_at": last_at,
        }

    async def get_bot_or_raise(self, bot_id: int, owner_id: Optional[int] = None) -> BotModel:
        """Получить бота или поднять ValueError."""
        query = select(BotModel).where(BotModel.id == bot_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        bot = result.scalar_one_or_none()
        if not bot:
            raise ValueError("Bot not found")
        return bot

    async def broadcast(
        self, bot_id: int, data: SendMessageRequest,
        owner_id: Optional[int] = None,
    ) -> BroadcastResponse:
        """Рассылка сообщения всем незаблокированным чатам бота."""
        bot = await self.get_bot_or_raise(bot_id, owner_id)
        if bot.status != BotStatus.ACTIVE:
            raise ValueError("Bot is not active")

        rows = await self.db.execute(
            select(DirectChat.tg_chat_id)
            .where(DirectChat.bot_id == bot_id, DirectChat.is_blocked == False)
        )
        chat_ids = [row[0] for row in rows.all()]

        telegram_bot = await resolve_for_bot_id(self.db, bot_id)
        reply_markup = build_keyboard(data.buttons) if data.buttons else None

        results: List[BroadcastResult] = []
        for chat_id in chat_ids:
            single = SendMessageRequest(
                chat_id=chat_id,
                text_content=data.text_content,
                media_url=data.media_url,
                media_type=data.media_type,
                buttons=data.buttons,
            )
            try:
                message = await self.dispatch_telegram(telegram_bot, single, reply_markup)
                file_id = message.photo[-1].file_id if message.photo else None
                await self.save(
                    bot_id=bot.id,
                    telegram_message_id=message.message_id,
                    chat_id=chat_id,
                    user_id=None,
                    message_type=data.media_type or MessageType.TEXT,
                    text_content=data.text_content,
                    media_file_id=file_id,
                    media_url=data.media_url,
                    is_incoming=False,
                    raw_data=message.model_dump(mode="json"),
                )
                results.append(BroadcastResult(chat_id=chat_id, success=True))
            except Exception as e:
                results.append(BroadcastResult(chat_id=chat_id, success=False, error=str(e)))

        sent = sum(1 for r in results if r.success)
        return BroadcastResponse(
            total=len(results),
            sent=sent,
            failed=len(results) - sent,
            results=results,
        )
