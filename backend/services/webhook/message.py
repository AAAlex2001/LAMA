"""
Обработчик сообщений и триггеров
"""
import asyncio
import logging
from typing import Optional

from aiogram.types import Message
from aiogram.exceptions import TelegramAPIError
from aiogram import Bot
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.channel import ChannelAutoDeleteService, ChannelNightModeService
from backend.services.bot import BotCommandService
from backend.services.bot.auto_reply import AutoReplyService
from backend.services.bot.moderation_triggers import ModerationTriggerService
from backend.services.bot.triggers import TriggerService
from backend.services.webhook.welcome import WelcomeHandler
from backend.models.bots import Bot as BotModel, TriggerType
from backend.tasks.bot_polling import send_command_response, send_auto_reply_response
from backend.services.webhook.base import get_bot_session, TELEGRAM_API_TIMEOUT

logger = logging.getLogger(__name__)

# Модерационные команды
MODERATION_COMMANDS = {"/admin", "/ban", "/unban", "/mute", "/unmute", "/delitetime"}


class MessageHandler:
    """Обработчик сообщений"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.trigger_service = TriggerService(db)
        self.welcome_handler = WelcomeHandler(db, bot_model)

    async def process(self, message: Message) -> None:
        """Обработка сообщения"""
        text_content = message.text or message.caption
        chat_type = message.chat.type if message.chat else None

        try:
            async with get_bot_session() as telegram_bot:
                # Удаление системных сообщений
                auto_delete_service = ChannelAutoDeleteService(self.db)
                if await auto_delete_service.delete_if_system_message(telegram_bot, message):
                    return

                # Проверка ночного режима
                if await self.check_night_mode(telegram_bot, message):
                    return

                # Обработка добавления новых участников
                if message.new_chat_members:
                    await self.handle_new_members(telegram_bot, message)

                # Обработка ухода участников
                if message.left_chat_member:
                    await self.handle_member_left(telegram_bot, message)

                # Обработка текстового контента
                if text_content:
                    await self.process_text(
                        telegram_bot, message, text_content, chat_type, auto_delete_service
                    )

        except Exception as e:
            logger.error(f"Message processing error: {e}", exc_info=True)

    async def check_night_mode(self, telegram_bot: Bot, message: Message) -> bool:
        """Проверка ночного режима. Возвращает True, если сообщение заблокировано"""
        is_media = any([
            getattr(message, attr, None)
            for attr in ["photo", "video", "document", "audio", "voice", "sticker", "animation"]
        ])

        night_mode_service = ChannelNightModeService(self.db)
        should_block, notice = await night_mode_service.should_block_message(
            message.chat.id,
            is_media=is_media,
        )

        if should_block:
            try:
                await asyncio.wait_for(
                    telegram_bot.delete_message(
                        chat_id=message.chat.id,
                        message_id=message.message_id,
                    ),
                    timeout=TELEGRAM_API_TIMEOUT
                )
            except (TelegramAPIError, asyncio.TimeoutError):
                pass

            if notice:
                try:
                    await asyncio.wait_for(
                        telegram_bot.send_message(
                            chat_id=message.chat.id,
                            text=notice,
                        ),
                        timeout=TELEGRAM_API_TIMEOUT
                    )
                except (TelegramAPIError, asyncio.TimeoutError):
                    pass
            return True

        return False

    async def handle_new_members(self, telegram_bot: Bot, message: Message) -> None:
        """Обработка добавления новых участников - триггер MEMBER_JOINED"""
        for new_member in message.new_chat_members:
            # Отправка приветствия в группу
            await self.welcome_handler.handle_new_member(message, new_member)
            
            # Триггер MEMBER_JOINED для дополнительной логики
            await self.trigger_service.fire_event(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.MEMBER_JOINED,
                user_id=new_member.id,
                chat_id=message.chat.id,
                telegram_bot=telegram_bot,
                context={
                    "username": new_member.username,
                    "first_name": new_member.first_name,
                    "last_name": new_member.last_name,
                }
            )

    async def handle_member_left(self, telegram_bot: Bot, message: Message) -> None:
        """Обработка ухода участника - триггер MEMBER_LEFT"""
        left_member = message.left_chat_member
        await self.trigger_service.fire_event(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.MEMBER_LEFT,
            user_id=left_member.id,
            chat_id=message.chat.id,
            telegram_bot=telegram_bot,
            context={
                "username": left_member.username,
                "first_name": left_member.first_name,
                "last_name": left_member.last_name,
            }
        )

    async def process_text(
        self,
        telegram_bot: Bot,
        message: Message,
        text_content: str,
        chat_type: Optional[str],
        auto_delete_service: ChannelAutoDeleteService
    ) -> None:
        """Обработка текстового сообщения"""
        # Проверка на команду
        if text_content.startswith("/"):
            await self.process_command(
                telegram_bot, message, text_content, chat_type, auto_delete_service
            )
            return

        # Триггер USER_MESSAGE (для любых текстовых сообщений)
        user_id = message.from_user.id if message.from_user else 0
        await self.trigger_service.fire_event(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.USER_MESSAGE,
            user_id=user_id,
            chat_id=message.chat.id,
            telegram_bot=telegram_bot,
            context={"text": text_content[:100]}
        )

        # Проверка автоответов
        auto_reply_service = AutoReplyService(self.db)
        auto_reply = await auto_reply_service.find_auto_reply_by_text(
            self.bot_model.id,
            text_content,
            chat_type=chat_type
        )

        if auto_reply:
            await send_auto_reply_response(telegram_bot, message, auto_reply, self.bot_model)

    async def process_command(
        self,
        telegram_bot: Bot,
        message: Message,
        text_content: str,
        chat_type: Optional[str],
        auto_delete_service: ChannelAutoDeleteService
    ) -> None:
        """Обработка команды"""
        command_text = text_content.split()[0]
        user_id = message.from_user.id if message.from_user else 0

        # Модерационные команды
        if command_text.lower() in MODERATION_COMMANDS:
            moderation_trigger_service = ModerationTriggerService()
            handled = await moderation_trigger_service.handle_moderation_command(
                command=command_text,
                message=message,
                telegram_bot=telegram_bot
            )

            if handled:
                await auto_delete_service.delete_if_command_message(telegram_bot, message)
            return

        # Пользовательские команды
        command_service = BotCommandService(self.db)
        command = await command_service.find_command_by_text(
            self.bot_model.id,
            command_text,
            chat_type=chat_type
        )

        if command:
            # Триггер COMMAND_CALLED
            await self.trigger_service.fire_event(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.COMMAND_CALLED,
                user_id=user_id,
                chat_id=message.chat.id,
                telegram_bot=telegram_bot,
                context={"command": command_text}
            )

            await send_command_response(telegram_bot, message, command, self.bot_model)
            await auto_delete_service.delete_if_command_message(telegram_bot, message)
            return

        # Команда не найдена, но удаляем исходное сообщение
        await auto_delete_service.delete_if_command_message(telegram_bot, message)

