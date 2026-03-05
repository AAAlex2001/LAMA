"""Обработчик сообщений polling-ботов: команды, автоответы, ночной режим."""

import asyncio
import logging
from typing import Optional

from aiogram import Bot
from aiogram.types import Message
from aiogram.exceptions import TelegramAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, MessageType
from backend.services.bot import BotCommandService
from backend.services.bot.auto_reply import AutoReplyService
from backend.services.bot.shortcodes import ShortcodeProcessor
from backend.services.bot.moderation_triggers import ModerationTriggerService
from backend.services.channel import ChannelAutoDeleteService, ChannelNightModeService
from backend.services.polling.base import TELEGRAM_API_TIMEOUT
from backend.services.polling.schemas import ShortcodeContext, UserContext, BotContext, BotResponse
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)

MODERATION_COMMANDS = {"/admin", "/ban", "/unban", "/mute", "/unmute", "/delitetime"}


class PollingMessageHandler:
    """Обработчик входящих сообщений polling-бота."""

    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot: Bot):
        self.db = db
        self.bot_model = bot_model
        self.bot = telegram_bot

    async def process(self, message: Message) -> None:
        """Основная точка входа обработки сообщения."""
        text_content = message.text or message.caption
        chat_type = message.chat.type if message.chat else None

        try:
            auto_delete = ChannelAutoDeleteService(self.db)

            if await auto_delete.delete_if_system(self.bot, message):
                return

            if await self.check_night_mode(message):
                return

            if text_content:
                await self.process_text(message, text_content, chat_type, auto_delete)

        except Exception as e:
            logger.error(f"Message processing error: {e}", exc_info=True)

    async def check_night_mode(self, message: Message) -> bool:
        """Проверка ночного режима. True = сообщение заблокировано."""
        is_media = any(
            getattr(message, attr, None)
            for attr in ("photo", "video", "document", "audio", "voice", "sticker", "animation")
        )

        night_service = ChannelNightModeService(self.db)
        should_block, notice = await night_service.should_block_message(
            message.chat.id, is_media=is_media,
        )

        if not should_block:
            return False

        try:
            await asyncio.wait_for(
                self.bot.delete_message(chat_id=message.chat.id, message_id=message.message_id),
                timeout=TELEGRAM_API_TIMEOUT,
            )
        except (TelegramAPIError, asyncio.TimeoutError):
            pass

        if notice:
            try:
                await asyncio.wait_for(
                    self.bot.send_message(chat_id=message.chat.id, text=notice),
                    timeout=TELEGRAM_API_TIMEOUT,
                )
            except (TelegramAPIError, asyncio.TimeoutError):
                pass

        return True

    async def process_text(
        self,
        message: Message,
        text: str,
        chat_type: Optional[str],
        auto_delete: ChannelAutoDeleteService,
    ) -> None:
        """Обработка текста: команды или автоответы."""
        if text.startswith("/"):
            await self.process_command(message, text, chat_type, auto_delete)
            return

        # Автоответ
        service = AutoReplyService(self.db)
        auto_reply = await service.find_auto_reply_by_text(
            self.bot_model.id, text, chat_type=chat_type,
        )

        if auto_reply:
            context = self.build_context(message)
            processed = ShortcodeProcessor.process(auto_reply.response_text, context.model_dump())
            response = BotResponse(
                text=processed,
                media_url=auto_reply.response_media_url,
                media_type=auto_reply.response_media_type,
                buttons=auto_reply.response_buttons,
            )
            await self.send_response(message.chat.id, response)

    async def process_command(
        self,
        message: Message,
        text: str,
        chat_type: Optional[str],
        auto_delete: ChannelAutoDeleteService,
    ) -> None:
        """Обработка команды бота."""
        command_text = text.split()[0].lower()

        # Модерационные команды (/ban, /mute и т.д.)
        if command_text in MODERATION_COMMANDS:
            service = ModerationTriggerService(self.db)
            if await service.handle_moderation_command(command_text, message, self.bot):
                await auto_delete.delete_if_command(self.bot, message)
            return

        # Пользовательские команды
        command_service = BotCommandService(self.db)
        command = await command_service.find_command_by_text(
            self.bot_model.id, command_text, chat_type=chat_type,
        )

        if command:
            context = self.build_context(message)
            processed = ShortcodeProcessor.process(command.response_text, context.model_dump())
            response = BotResponse(
                text=processed,
                media_url=command.response_media_url,
                media_type=command.response_media_type,
                buttons=command.response_buttons,
            )
            await self.send_response(message.chat.id, response)

        await auto_delete.delete_if_command(self.bot, message)

    async def send_response(self, chat_id: int, response: BotResponse) -> None:
        """Отправка ответа (текст или медиа + кнопки)."""
        reply_markup = build_keyboard(response.buttons)

        if response.media_url and response.media_type:
            send_map = {
                MessageType.PHOTO: ("photo", self.bot.send_photo),
                MessageType.VIDEO: ("video", self.bot.send_video),
                MessageType.DOCUMENT: ("document", self.bot.send_document),
            }
            entry = send_map.get(response.media_type)
            if entry:
                param, method = entry
                await method(
                    chat_id=chat_id,
                    **{param: response.media_url},
                    caption=response.text,
                    reply_markup=reply_markup,
                )
                return

        await self.bot.send_message(chat_id=chat_id, text=response.text, reply_markup=reply_markup)

    def build_context(self, message: Message) -> ShortcodeContext:
        """Построить Pydantic-контекст для шорткодов."""
        user = message.from_user
        return ShortcodeContext(
            user=UserContext(
                id=user.id if user else 0,
                first_name=user.first_name if user else "",
                username=user.username if user else None,
            ),
            bot=BotContext(first_name=self.bot_model.first_name or ""),
        )
