"""
Обработчик сообщений и триггеров
"""
import asyncio
import logging
from typing import Optional

from aiogram import Bot
from backend.services.telegram_client import RateLimitedBot
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
from backend.schemas.direct.chat import DirectChatWsEvent
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventType, EventStatus

logger = logging.getLogger(__name__)

class MessageHandler:
    """Обработчик сообщений"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def save_message(self, message: Message) -> Optional[DirectChatWsEvent]:
        """Сохраняет входящее сообщение. Быстро возвращает WS-событие."""
        text_content = message.text or message.caption
        chat_type = message.chat.type if message.chat else None
        logger.info(
            f"Processing message from chat {message.chat.id}, "
            f"type={chat_type}, bot_id={self.bot_model.id}, "
            f"text={text_content[:50] if text_content else 'none'}"
        )

        self.saved_msg = None

        if chat_type != "private":
            if message.from_user and chat_type in ("group", "supergroup"):
                await self.handle_group_comment(message, text_content)
            return None

        if not message.from_user:

        try:
            chat_svc = DirectChatService(self.db)
            msg_svc = DirectMessageService(self.db)

            photo_url = await self.resolve_user_photo(message.from_user.id)

            await chat_svc.get_or_create_chat(
                bot_id=self.bot_model.id,
                tg_chat_id=message.chat.id,
                tg_user_id=message.from_user.id,
                tg_username=message.from_user.username,
                tg_first_name=message.from_user.first_name,
                tg_last_name=message.from_user.last_name,
                tg_photo_url=photo_url,
            )
            await chat_svc.increment_unread(self.bot_model.id, message.chat.id)
            self.saved_msg = await msg_svc.save_incoming_message(
                bot_id=self.bot_model.id,
                owner_id=self.bot_model.owner_id,
                message=message
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

            if self.saved_msg:
                await self.db.flush()
                await self.db.refresh(self.saved_msg)
                return DirectChatWsEvent(
                    user_id=self.bot_model.owner_id,
                    bot_id=self.bot_model.id,
                    chat_id=message.chat.id,
                    event_type="message_new",
                    payload={"message_id": self.saved_msg.id},
                )

        except Exception as e:
            logger.error(f"Message save error: {e}", exc_info=True)

        return None

    async def handle_group_comment(self, message: Message, text_content: Optional[str]) -> None:
        """Создать inbox-уведомление о комментарии в группе обсуждений канала."""
        if not message.reply_to_message:
            return

        try:
            from sqlalchemy import select, or_
            from backend.models.channels import ChannelGroup

            chat_id = message.chat.id
            query = select(ChannelGroup).where(
                ChannelGroup.owner_id == self.bot_model.owner_id,
                or_(
                    ChannelGroup.linked_chat_id == chat_id,
                    ChannelGroup.telegram_id == chat_id,
                ),
            )
            result = await self.db.execute(query)
            channel = result.scalar_one_or_none()
            if not channel:
                return

            inbox_service = InboxActionService(self.db)
            preview = text_content[:100] if text_content else "(медиа)"
            sender = message.from_user.username or str(message.from_user.id)

            await inbox_service.create_event({
                "owner_id": self.bot_model.owner_id,
                "category": InboxCategory.MODERATION,
                "entity_type": EntityType.CHANNEL,
                "event_type": EventType.CHANNEL_COMMENT,
                "bot_id": self.bot_model.id,
                "channel_id": channel.id,
                "tg_user_id": message.from_user.id,
                "tg_username": message.from_user.username,
                "status": EventStatus.NEW,
                "description": f"Комментарий от @{sender}: {preview}",
                "payload": {
                    "message_id": message.message_id,
                    "chat_id": chat_id,
                    "text": text_content[:500] if text_content else None,
                    "first_name": message.from_user.first_name,
                    "chat_title": message.chat.title,
                    "reply_to_message_id": message.reply_to_message.message_id if message.reply_to_message else None,
                },
            })
        except Exception as e:
            logger.error("Failed to create CHANNEL_COMMENT inbox event: %s", e, exc_info=True)

    async def process_side_effects(self, message: Message) -> None:
        """Обработка триггеров, автоответов, медиа и прочей логики."""
        text_content = message.text or message.caption
        chat_type = message.chat.type if message.chat else None
        saved_msg = self.saved_msg

        try:
            async with get_bot_session(self.bot_model.token) as telegram_bot:
                if saved_msg and saved_msg.media_file_id and not saved_msg.media_url:
                    try:
                        tg_file = await telegram_bot.get_file(saved_msg.media_file_id)
                        if tg_file.file_path:
                            saved_msg.media_url = (
                                f"https://api.telegram.org/file/"
                                f"bot{self.bot_model.token}/{tg_file.file_path}"
                            )
                            await self.db.flush()
                    except Exception as e:
                        logger.error(f"Не удалось получить URL медиафайла: {e}", exc_info=True)

                auto_delete_service = ChannelAutoDeleteService(self.db)
                if await auto_delete_service.delete_if_system(telegram_bot, message):
                    return

                if await self.check_night_mode(telegram_bot, message):
                    return

                member_processor = MemberProcessor(self.db, self.bot_model, telegram_bot)

                if message.new_chat_members:
                    await member_processor.handle_new_members(message)

                if message.left_chat_member:
                    await member_processor.handle_member_left(message)

                if text_content:
                    text_processor = TextProcessor(self.db, self.bot_model, telegram_bot)
                    await text_processor.process_text(
                        message, text_content, chat_type, auto_delete_service
                    )

        except Exception as e:
            logger.error(f"Side effects processing error: {e}", exc_info=True)

    async def resolve_user_photo(self, user_id: int) -> Optional[str]:
        """Получить URL аватара пользователя через Telegram API."""
        try:
            async with get_bot_session(self.bot_model.token) as client:
                photos = await client.get_user_profile_photos(user_id=user_id, limit=1)
                if photos.photos and photos.photos[0]:
                    smallest = photos.photos[0][-1]
                    tg_file = await client.get_file(smallest.file_id)
                    if tg_file.file_path:
                        return f"https://api.telegram.org/file/bot{self.bot_model.token}/{tg_file.file_path}"
        except Exception as e:
            logger.debug(f"Could not resolve user photo for {user_id}: {e}")
        return None

    async def check_night_mode(self, telegram_bot: RateLimitedBot, message: Message) -> bool:
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