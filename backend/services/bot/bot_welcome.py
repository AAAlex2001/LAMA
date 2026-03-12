from fastapi import HTTPException
import logging
from typing import Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from aiogram import Bot
from aiogram.types import Message, ChatJoinRequest
from aiogram.exceptions import TelegramAPIError

from backend.models.bots import Bot as BotModel, MessageType
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)

MEDIA_SEND_METHODS = {
    MessageType.PHOTO: "send_photo",
    MessageType.VIDEO: "send_video",
    MessageType.DOCUMENT: "send_document",
    MessageType.ANIMATION: "send_animation",
}


class BotWelcomeService:
    """Отправка приветственных сообщений."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_welcome(
        self, telegram_bot: Bot, bot_model: BotModel,
        user_id: int, chat_id: int,
        context: Optional[Dict[str, Any]] = None,
        message_thread_id: Optional[int] = None,
    ) -> Optional[Message]:
        """Отправить приветственное сообщение."""
        if not bot_model.welcome_enabled or not bot_model.welcome_message:
            raise HTTPException(status_code=404, detail="Bot not found")

        try:
            text = ShortcodeProcessor.process(bot_model.welcome_message, context)
            reply_markup = build_keyboard(bot_model.welcome_buttons)

            message = await self.send_media_or_text(
                telegram_bot, chat_id, text,
                media_url=bot_model.welcome_media_url,
                media_type=bot_model.welcome_media_type,
                reply_markup=reply_markup,
                message_thread_id=message_thread_id,
            )
            logger.info(f"Welcome message sent to user {user_id} in chat {chat_id}")
            return message
        except TelegramAPIError as e:
            logger.warning(f"Failed to send welcome to user {user_id}: {e}")
            return None

    async def send_media_or_text(
        self, telegram_bot: Bot, chat_id: int, text: str,
        media_url: Optional[str] = None,
        media_type: Optional[MessageType] = None,
        reply_markup=None,
        message_thread_id: Optional[int] = None,
    ) -> Message:
        """Отправить сообщение с медиа или текст."""
        if media_url and media_type and media_type in MEDIA_SEND_METHODS:
            method = getattr(telegram_bot, MEDIA_SEND_METHODS[media_type])
            return await method(
                chat_id=chat_id,
                **{media_type.value.lower(): media_url},
                caption=text,
                reply_markup=reply_markup,
                message_thread_id=message_thread_id,
            )

        return await telegram_bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_markup=reply_markup,
            message_thread_id=message_thread_id,
        )

    def build_context(
        self, user_id: int,
        user_first_name: Optional[str] = None,
        user_username: Optional[str] = None,
        user_last_name: Optional[str] = None,
        bot_first_name: Optional[str] = None,
        chat_title: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Построить контекст для шорткодов."""
        return {
            "user": {
                "id": user_id,
                "first_name": user_first_name or "",
                "username": user_username,
                "last_name": user_last_name or "",
            },
            "bot": {"first_name": bot_first_name or ""},
            "chat": {"title": chat_title or ""},
        }

    async def handle_join_request(
        self, telegram_bot: Bot, bot_model: BotModel,
        join_request: ChatJoinRequest,
    ) -> Optional[Message]:
        """Приветствие при заявке на вступление (в ЛС)."""
        if not bot_model.welcome_enabled:
            raise HTTPException(status_code=404, detail="Bot not found")

        user = join_request.from_user
        context = self.build_context(
            user_id=user.id,
            user_first_name=user.first_name,
            user_username=user.username,
            user_last_name=getattr(user, "last_name", None),
            bot_first_name=bot_model.first_name,
            chat_title=join_request.chat.title if join_request.chat else None,
        )
        return await self.send_welcome(
            telegram_bot, bot_model,
            user_id=user.id, chat_id=user.id,
            context=context,
        )

    async def handle_member_joined(
        self, telegram_bot: Bot, bot_model: BotModel,
        user_id: int, chat_id: int,
        user_first_name: Optional[str] = None,
        user_username: Optional[str] = None,
        user_last_name: Optional[str] = None,
        chat_title: Optional[str] = None,
        message_thread_id: Optional[int] = None,
    ) -> Optional[Message]:
        """Приветствие при добавлении участника в группу."""
        if not bot_model.welcome_enabled:
            raise HTTPException(status_code=404, detail="Bot not found")

        context = self.build_context(
            user_id=user_id,
            user_first_name=user_first_name,
            user_username=user_username,
            user_last_name=user_last_name,
            bot_first_name=bot_model.first_name,
            chat_title=chat_title,
        )
        return await self.send_welcome(
            telegram_bot, bot_model,
            user_id=user_id, chat_id=chat_id,
            context=context,
            message_thread_id=message_thread_id,
        )
