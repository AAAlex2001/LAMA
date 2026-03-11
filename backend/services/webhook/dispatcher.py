"""
Главный диспетчер webhook событий
"""

import asyncio
import logging
import os

from aiogram.types import Update, Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.models.bots import BotStatus
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.base import get_bot_by_token, get_bot_by_chat_id
from backend.services.webhook.moderation import ModerationHandler
from backend.services.webhook.messages import MessageHandler
from backend.services.webhook.join_request import JoinRequestHandler
from backend.services.webhook.callbacks import CallbackHandler
from backend.services.webhook.subscription import SubscriptionHandler
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)


class WebhookDispatcher:
    """Диспетчер обработки webhook событий"""

    @staticmethod
    async def dispatch(update: Update, bot_token: str | None = None) -> None:
        """
        Распределить обработку Update по соответствующим хендлерам.
        Запускает задачи параллельно.
        """
        tasks = []

        # Получаем сообщение из разных источников
        message = (
            update.message
            or update.channel_post
            or update.edited_message
            or update.edited_channel_post
        )

        # Задача 1: Модерация сообщений (независимая, для групп/каналов)
        if message and message.chat and (message.text or message.caption):
            if message.chat.type in {"group", "supergroup", "channel"}:
                tasks.append(WebhookDispatcher.process_moderation(
                    message, bot_token))

        # Задача 2: Основная логика бота
        tasks.append(WebhookDispatcher.process_bot_logic(update, bot_token))

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
    async def process_moderation(
        message: Message, bot_token: str | None = None
    ) -> None:
        """Обработка модерации"""
        try:
            async with AsyncSessionLocal() as db:
                if bot_token:
                    bot_model = await get_bot_by_token(db, bot_token)
                else:
                    bot_model = await get_bot_by_chat_id(db, message.chat.id)

                if not bot_model:
                    logger.warning(
                        "Bot with requested token/chat not found in DB")
                    return

                if bot_model.status == BotStatus.INACTIVE:
                    return

                handler = ModerationHandler(db, bot_model)
                await handler.process(message)
                await db.commit()
        except Exception as e:
            logger.error(f"Moderation processing error: {e}", exc_info=True)

    @staticmethod
    async def process_bot_logic(
        update: Update, bot_token: str | None = None
    ) -> None:
        """Основная логика обработки бота"""
        try:
            async with AsyncSessionLocal() as db:
                if bot_token:
                    bot_model = await get_bot_by_token(db, bot_token)
                else:
                    chat_id = None
                    if update.message and update.message.chat:
                        chat_id = update.message.chat.id
                    elif (update.callback_query
                          and update.callback_query.message):
                        chat_id = update.callback_query.message.chat.id
                    elif (update.chat_join_request
                          and update.chat_join_request.chat):
                        chat_id = update.chat_join_request.chat.id
                    elif update.chat_member and update.chat_member.chat:
                        chat_id = update.chat_member.chat.id

                    if chat_id:
                        bot_model = await get_bot_by_chat_id(db, chat_id)
                    else:
                        bot_model = None

                if not bot_model:
                    logger.warning(
                        "Bot with requested token/chat not found in DB")
                    return

                if bot_model.status == BotStatus.INACTIVE:
                    return

                # Специальная обработка команды /start для авторизации
                if update.message and update.message.text:
                    command = update.message.text.split()[0].lower()
                    if command == "/start":
                        await WebhookDispatcher.handle_auth_command(
                            db, update.message, bot_token
                        )
                        await db.commit()
                        return
                    if command == "/guest":
                        await WebhookDispatcher.handle_guest_command(
                            db, update.message, bot_token
                        )
                        await db.commit()
                        return

                # Обработка заявки на вступление
                if update.chat_join_request:
                    join_handler = JoinRequestHandler(db, bot_model)
                    await join_handler.process(update.chat_join_request)
                    await db.commit()
                    return

                # Обработка сообщений
                if update.message and update.message.chat:
                    message_handler = MessageHandler(db, bot_model)
                    await message_handler.process(update.message)
                    await db.commit()
                    return

                # Обработка callback query
                if update.callback_query and update.callback_query.data:
                    callback_handler = CallbackHandler(db, bot_model)
                    await callback_handler.process(update.callback_query)
                    await db.commit()
                    return

                # Обработка подписки на канал
                if update.chat_member and update.chat_member.new_chat_member:
                    subscription_handler = SubscriptionHandler(db, bot_model)
                    await subscription_handler.process(update.chat_member)
                    await db.commit()
                    return

        except Exception as e:
            logger.error(f"Bot logic error: {e}", exc_info=True)

    @staticmethod
    async def handle_auth_command(
        db: AsyncSession, message: Message, bot_token: str
    ) -> None:
        """Обработка команды /start для авторизации"""
        user_id = message.from_user.id if message.from_user else 0
        if not user_id:
            return

        bot = resolve_by_token(bot_token)

        try:
            frontend_url = os.getenv("FRONTEND_URL", "https://lamaplanner.com")
            login_url = f"{frontend_url}/login?tg_id={user_id}"

            if message.from_user and message.from_user.username:
                login_url += f"&username={message.from_user.username}"
            if message.from_user and message.from_user.first_name:
                login_url += f"&first_name={message.from_user.first_name}"
            if message.from_user and message.from_user.last_name:
                login_url += f"&last_name={message.from_user.last_name}"

            keyboard = build_keyboard(
                [[{"text": "🔐 Войти в Lama Planner", "url": login_url}]]
            )

            first_name = (
                message.from_user.first_name
                if message.from_user
                else "пользователь"
            )
            response_text = (
                f"👋 <b>Привет, {first_name}!</b>\n\n"
                f"Для того, чтобы войти в аккаунт, нажмите на кнопку ниже:"
            )

            await bot.send_message(
                chat_id=message.chat.id,
                text=response_text,
                parse_mode="HTML",
                reply_markup=keyboard,
                reply_to_message_id=message.message_id,
            )

        except Exception as e:
            logger.error(f"Auth command error: {e}", exc_info=True)
            await bot.send_message(
                chat_id=message.chat.id,
                text="❌ Ошибка при отправке ссылки. Попробуйте позже.",
                reply_to_message_id=message.message_id,
            )

    @staticmethod
    async def handle_guest_command(
        db: AsyncSession, message: Message, bot_token: str
    ) -> None:
        """Обработка команды /guest для гостевого доступа к созданию постов"""
        user_id = message.from_user.id if message.from_user else 0
        if not user_id:
            return

        bot = resolve_by_token(bot_token)

        try:
            import aiohttp

            # Получаем URL бэкенда и фронтенда
            api_base_url = os.getenv(
                "API_BASE_URL", "http://localhost:8000/api")
            frontend_url = os.getenv("FRONTEND_URL", "https://lamaplanner.com")

            # Формируем данные для запроса токена
            user_data = {
                "telegram_id": user_id,
                "username": message.from_user.username
                if message.from_user
                else None,
                "first_name": (
                    message.from_user.first_name if message.from_user else None
                ),
                "last_name": message.from_user.last_name
                if message.from_user
                else None,
            }

            # Запрашиваем токен
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{api_base_url}/auth/bot-guest-token", json=user_data
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        access_token = data.get("access_token")

                        if access_token:
                            # Формируем ссылку с токеном
                            create_post_link = (
                                f"{frontend_url}/ru/create-post"
                                f"?token={access_token}"
                            )

                            first_name = (
                                message.from_user.first_name
                                if message.from_user
                                else "пользователь"
                            )

                            response_text = (
                                f"✍️ <b>Привет, {first_name}!</b>\n\n"
                                f"Создайте пост через веб-интерфейс:\n\n"
                                f"🔗 {create_post_link}\n\n"
                                f"⏱ Ссылка действительна 24 часа"
                            )

                            await bot.send_message(
                                chat_id=message.chat.id,
                                text=response_text,
                                parse_mode="HTML",
                                disable_web_page_preview=True,
                                reply_to_message_id=message.message_id,
                            )
                        else:
                            raise Exception("No access token in response")
                    else:
                        error_text = await response.text()
                        raise Exception(
                            f"API returned {response.status}: {error_text}")

        except Exception as e:
            logger.error(f"Guest command error: {e}", exc_info=True)
            await bot.send_message(
                chat_id=message.chat.id,
                text="❌ Ошибка при создании ссылки. Попробуйте позже.",
                reply_to_message_id=message.message_id,
            )
