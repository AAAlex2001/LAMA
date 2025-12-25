"""
Главный диспетчер webhook событий
"""
import asyncio
import logging

from aiogram.types import Update, Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.services.webhook.base import get_master_bot_model
from backend.services.webhook.moderation import ModerationHandler
from backend.services.webhook.message import MessageHandler
from backend.services.webhook.join_request import JoinRequestHandler
from backend.services.webhook.callback import CallbackHandler
from backend.services.webhook.subscription import SubscriptionHandler

logger = logging.getLogger(__name__)


class WebhookDispatcher:
    """Диспетчер обработки webhook событий"""

    @staticmethod
    async def dispatch(update: Update) -> None:
        """
        Распределить обработку Update по соответствующим хендлерам.
        Запускает задачи параллельно.
        """
        tasks = []

        # Получаем сообщение из разных источников
        message = (
            update.message or 
            update.channel_post or 
            update.edited_message or 
            update.edited_channel_post
        )

        # Задача 1: Модерация сообщений (независимая, для групп/каналов)
        if message and message.chat and (message.text or message.caption):
            if message.chat.type in {"group", "supergroup", "channel"}:
                tasks.append(WebhookDispatcher.process_moderation(message))

        # Задача 2: Основная логика бота
        tasks.append(WebhookDispatcher.process_bot_logic(update))

        # Запускаем задачи параллельно
        if tasks:
            await WebhookDispatcher.run_tasks(tasks)

    @staticmethod
    async def run_tasks(tasks: list) -> None:
        """Запустить задачи с обработкой ошибок"""
        try:
            await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            logger.error(f"Background tasks error: {e}", exc_info=True)

    @staticmethod
    async def process_moderation(message: Message) -> None:
        """Обработка модерации"""
        try:
            async with AsyncSessionLocal() as db:
                handler = ModerationHandler(db)
                await handler.process(message)
        except Exception as e:
            logger.error(f"Moderation processing error: {e}", exc_info=True)

    @staticmethod
    async def process_bot_logic(update: Update) -> None:
        """Основная логика обработки бота"""
        try:
            async with AsyncSessionLocal() as db:
                # Специальная обработка команды /start для авторизации (работает всегда)
                if update.message and update.message.text:
                    command = update.message.text.split()[0].lower()
                    if command == "/start":
                        await WebhookDispatcher.handle_auth_command(db, update.message)
                        return
                
                bot_model = await get_master_bot_model(db)
                if not bot_model:
                    return

                # Обработка заявки на вступление
                if update.chat_join_request:
                    handler = JoinRequestHandler(db, bot_model)
                    await handler.process(update.chat_join_request)
                    return

                # Обработка сообщений
                if update.message and update.message.chat:
                    handler = MessageHandler(db, bot_model)
                    await handler.process(update.message)
                    return

                # Обработка callback query
                if update.callback_query and update.callback_query.data:
                    handler = CallbackHandler(db, bot_model)
                    await handler.process(update.callback_query)
                    return

                # Обработка подписки на канал
                if update.chat_member and update.chat_member.new_chat_member:
                    handler = SubscriptionHandler(db, bot_model)
                    await handler.process(update.chat_member)
                    return

        except Exception as e:
            logger.error(f"Bot logic error: {e}", exc_info=True)
    
    @staticmethod
    async def handle_auth_command(db: AsyncSession, message: Message) -> None:
        """Обработка команды /start для авторизации"""
        from backend.services.auth.auth_service import AuthService
        from backend.config import TELEGRAM_BOT_TOKEN
        from aiogram import Bot
        import os
        
        user_id = message.from_user.id if message.from_user else 0
        if not user_id:
            return
        
        jwt_secret = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
        
        auth_service = AuthService(db, TELEGRAM_BOT_TOKEN, jwt_secret)
        bot = Bot(token=TELEGRAM_BOT_TOKEN)
        
        try:
            login_code = await auth_service.create_bot_login_code(
                telegram_id=user_id,
                username=message.from_user.username if message.from_user else None,
                first_name=message.from_user.first_name if message.from_user else None,
                last_name=message.from_user.last_name if message.from_user else None,
                photo_url=None,
                expires_minutes=5
            )
            
            response_text = (
                f"🔐 <b>Код для входа на сайт:</b>\n\n"
                f"<code>{login_code.code}</code>\n\n"
                f"Введите этот код на странице авторизации.\n"
                f"⏱ Код действителен 5 минут."
            )
            
            await bot.send_message(
                chat_id=message.chat.id,
                text=response_text,
                parse_mode="HTML",
                reply_to_message_id=message.message_id
            )
            
        except Exception as e:
            logger.error(f"Auth command error: {e}", exc_info=True)
            await bot.send_message(
                chat_id=message.chat.id,
                text="❌ Ошибка при создании кода. Попробуйте позже.",
                reply_to_message_id=message.message_id
            )
        finally:
            await bot.session.close()

