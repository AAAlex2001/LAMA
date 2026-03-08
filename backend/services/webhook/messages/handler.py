"""
Обработчик сообщений и триггеров
"""
import asyncio
import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.channel import ChannelAutoDeleteService, ChannelNightModeService
from backend.services.webhook.base import TELEGRAM_API_TIMEOUT, get_bot_session
from backend.services.webhook.messages.members import MemberProcessor
from backend.services.webhook.messages.text import TextProcessor
from backend.services.direct.chat_service import DirectChatService
from backend.services.direct.message_service import DirectMessageService
from backend.services.inbox.action_service import InboxActionService
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventType, EventStatus

logger = logging.getLogger(__name__)

class MessageHandler:
    """Обработчик сообщений"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def process(self, message: Message) -> None:
        """Обработка сообщения"""
        text_content = message.text or message.caption
        chat_type = message.chat.type if message.chat else None
        logger.info(
            f"Processing message from chat {message.chat.id}, "
            f"type={chat_type}, bot_id={self.bot_model.id}, "
            f"text={text_content[:50] if text_content else 'none'}"
        )

        try:
            saved_msg = None
            if chat_type == "private" and message.from_user:
                chat_svc = DirectChatService(self.db)
                msg_svc = DirectMessageService(self.db)

                await chat_svc.get_or_create_chat(
                    bot_id=self.bot_model.id,
                    tg_chat_id=message.chat.id,
                    tg_user_id=message.from_user.id,
                    tg_username=message.from_user.username,
                    tg_first_name=message.from_user.first_name,
                    tg_last_name=message.from_user.last_name
                )
                await chat_svc.increment_unread(self.bot_model.id, message.chat.id)
                saved_msg = await msg_svc.save_incoming_message(
                    bot_id=self.bot_model.id,
                    owner_id=self.bot_model.owner_id,
                    message=message.model_dump()
                )

                is_command = bool(text_content and text_content.startswith("/"))
                if not is_command:
                    try:
                        inbox_service = InboxActionService(self.db)
                        preview = text_content[:100] if text_content else "(медиа)"
                        sender = message.from_user.username or str(message.from_user.id)

                        media_file_id = None
                        if message.photo:
                            media_file_id = message.photo[-1].file_id
                        elif message.video:
                            media_file_id = message.video.file_id
                        elif message.document:
                            media_file_id = message.document.file_id

                        await inbox_service.create_event({
                            "owner_id": self.bot_model.owner_id,
                            "category": InboxCategory.MODERATION,
                            "entity_type": EntityType.BOT,
                            "event_type": EventType.BOT_MESSAGE,
                            "bot_id": self.bot_model.id,
                            "tg_user_id": message.from_user.id,
                            "tg_username": message.from_user.username,
                            "status": EventStatus.NEW,
                            "description": f"Сообщение от @{sender}: {preview}",
                            "payload": {
                                "message_id": message.message_id,
                                "chat_id": message.chat.id,
                                "text": text_content[:500] if text_content else None,
                                "first_name": message.from_user.first_name,
                                "media_file_id": media_file_id,
                            },
                        })
                    except Exception as e:
                        logger.error(f"Не удалось создать BOT_MESSAGE inbox-событие: {e}", exc_info=True)

            async with get_bot_session(self.bot_model.token) as telegram_bot:
                if saved_msg and saved_msg.media_file_id and not saved_msg.media_url:
                    try:
                        tg_file = await telegram_bot.get_file(saved_msg.media_file_id)
                        if tg_file.file_path:
                            saved_msg.media_url = (
                                f"https://api.telegram.org/file/"
                                f"bot{self.bot_model.token}/{tg_file.file_path}"
                            )
                            await self.db.commit()
                    except Exception as e:
                        logger.error(f"Не удалось получить URL медиафайла: {e}", exc_info=True)
                # Удаление системных сообщений
                auto_delete_service = ChannelAutoDeleteService(self.db)
                if await auto_delete_service.delete_if_system(telegram_bot, message):
                    return

                # Проверка ночного режима
                if await self.check_night_mode(telegram_bot, message):
                    return

                member_processor = MemberProcessor(self.db, self.bot_model, telegram_bot)

                # Обработка добавления новых участников
                if message.new_chat_members:
                    await member_processor.handle_new_members(message)

                # Обработка ухода участников
                if message.left_chat_member:
                    await member_processor.handle_member_left(message)

                # Обработка текстового контента
                if text_content:
                    text_processor = TextProcessor(self.db, self.bot_model, telegram_bot)
                    await text_processor.process_text(
                        message, text_content, chat_type, auto_delete_service
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
            except (TelegramAPIError, asyncio.TimeoutError) as e:
                logger.warning(f"Failed to delete message: {e}")

            if notice:
                try:
                    await asyncio.wait_for(
                        telegram_bot.send_message(
                            chat_id=message.chat.id,
                            text=notice,
                        ),
                        timeout=TELEGRAM_API_TIMEOUT
                    )
                except (TelegramAPIError, asyncio.TimeoutError) as e:
                    logger.warning(f"Failed to send night mode notice: {e}")
            return True

        return False