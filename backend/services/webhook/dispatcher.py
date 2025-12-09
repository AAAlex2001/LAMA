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

