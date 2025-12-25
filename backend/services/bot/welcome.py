"""
Сервис для работы с приветственными сообщениями
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, Message, ChatJoinRequest
from aiogram.exceptions import TelegramAPIError

from backend.models.bots import Bot as BotModel, MessageType
from backend.services.bot.shortcodes import ShortcodeProcessor
from backend.utils import build_keyboard

logger = logging.getLogger(__name__)


class WelcomeService:
    """Сервис для работы с приветственными сообщениями"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_welcome_message(
        self,
        telegram_bot: Bot,
        bot_model: BotModel,
        user_id: int,
        chat_id: int,
        context: Optional[Dict[str, Any]] = None,
        message_thread_id: Optional[int] = None,
    ) -> Optional[Message]:
        """
        Отправить приветственное сообщение
        
        Args:
            telegram_bot: Экземпляр бота
            bot_model: Модель бота из БД
            user_id: ID пользователя
            chat_id: ID чата (для личных - user_id, для групп - chat_id)
            context: Контекст для шорткодов
            message_thread_id: ID топика (для групп с топиками)
        """
        if not bot_model.welcome_enabled or not bot_model.welcome_message:
            return None

        try:
            # Обработка шорткодов
            text = self.process_shortcodes(bot_model.welcome_message, context)
            
            # Формирование клавиатуры
            reply_markup = build_keyboard(bot_model.welcome_buttons)
            
            # Отправка сообщения
            message = await self.send_message(
                telegram_bot=telegram_bot,
                chat_id=chat_id,
                text=text,
                media_url=bot_model.welcome_media_url,
                media_type=bot_model.welcome_media_type,
                reply_markup=reply_markup,
                message_thread_id=message_thread_id,
            )
            
            logger.info(f"Welcome message sent to user {user_id} in chat {chat_id}")
            return message
            
        except TelegramAPIError as e:
            logger.warning(f"Failed to send welcome message to user {user_id}: {e}")
            return None

    def process_shortcodes(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Обработать шорткоды в тексте"""
        if not context:
            return text
        
        return ShortcodeProcessor.process(text, context)



    async def send_message(
        self,
        telegram_bot: Bot,
        chat_id: int,
        text: str,
        media_url: Optional[str] = None,
        media_type: Optional[MessageType] = None,
        reply_markup: Optional[InlineKeyboardMarkup] = None,
        message_thread_id: Optional[int] = None,
    ) -> Message:
        """Универсальная отправка сообщения с медиа"""
        
        send_kwargs = {
            "chat_id": chat_id,
            "reply_markup": reply_markup,
        }
        
        # Добавляем топик если указан
        if message_thread_id:
            send_kwargs["message_thread_id"] = message_thread_id

        # Отправка с медиа
        if media_url and media_type:
            send_methods = {
                MessageType.PHOTO: (telegram_bot.send_photo, "photo"),
                MessageType.VIDEO: (telegram_bot.send_video, "video"),
                MessageType.DOCUMENT: (telegram_bot.send_document, "document"),
                MessageType.ANIMATION: (telegram_bot.send_animation, "animation"),
            }

            if media_type in send_methods:
                method, param_name = send_methods[media_type]
                send_kwargs[param_name] = media_url
                send_kwargs["caption"] = text
                return await method(**send_kwargs)

        # Отправка текстового сообщения
        send_kwargs["text"] = text
        return await telegram_bot.send_message(**send_kwargs)

    def build_context(
        self,
        user_id: int,
        user_first_name: Optional[str] = None,
        user_username: Optional[str] = None,
        user_last_name: Optional[str] = None,
        bot_first_name: Optional[str] = None,
        chat_title: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Построить контекст для шорткодов
        
        Доступные шорткоды:
        - {user.id} - ID пользователя
        - {user.first_name} - имя пользователя
        - {user.username} - username пользователя (@username)
        - {user.last_name} - фамилия пользователя
        - {bot.first_name} - имя бота
        - {chat.title} - название чата
        - {date} - текущая дата (DD.MM.YYYY)
        - {time} - текущее время (HH:MM)
        - {datetime} - дата и время (DD.MM.YYYY HH:MM)
        """
        return {
            "user": {
                "id": user_id,
                "first_name": user_first_name or "",
                "username": user_username,
                "last_name": user_last_name or "",
            },
            "bot": {
                "first_name": bot_first_name or "",
            },
            "chat": {
                "title": chat_title or "",
            }
        }

    async def handle_join_request_welcome(
        self,
        telegram_bot: Bot,
        bot_model: BotModel,
        join_request: ChatJoinRequest,
    ) -> Optional[Message]:
        """
        Обработать приветствие при заявке на вступление
        Отправляется в личные сообщения пользователю
        """
        if not bot_model.welcome_enabled:
            return None

        context = self.build_context(
            user_id=join_request.from_user.id,
            user_first_name=join_request.from_user.first_name,
            user_username=join_request.from_user.username,
            user_last_name=getattr(join_request.from_user, "last_name", None),
            bot_first_name=bot_model.first_name,
            chat_title=join_request.chat.title if join_request.chat else None,
        )

        return await self.send_welcome_message(
            telegram_bot=telegram_bot,
            bot_model=bot_model,
            user_id=join_request.from_user.id,
            chat_id=join_request.from_user.id,  # Личные сообщения
            context=context,
        )

    async def handle_member_joined_welcome(
        self,
        telegram_bot: Bot,
        bot_model: BotModel,
        user_id: int,
        chat_id: int,
        user_first_name: Optional[str] = None,
        user_username: Optional[str] = None,
        user_last_name: Optional[str] = None,
        chat_title: Optional[str] = None,
        message_thread_id: Optional[int] = None,
    ) -> Optional[Message]:
        """
        Обработать приветствие при добавлении участника в группу
        Отправляется в группу (можно в конкретный топик)
        """
        if not bot_model.welcome_enabled:
            return None

        context = self.build_context(
            user_id=user_id,
            user_first_name=user_first_name,
            user_username=user_username,
            user_last_name=user_last_name,
            bot_first_name=bot_model.first_name,
            chat_title=chat_title,
        )

        return await self.send_welcome_message(
            telegram_bot=telegram_bot,
            bot_model=bot_model,
            user_id=user_id,
            chat_id=chat_id,  # Отправка в группу
            context=context,
            message_thread_id=message_thread_id,
        )

