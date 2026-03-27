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
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotMessage as BotMessageModel, MessageType
from backend.models.channels import ChannelGroup
from backend.services.channel import ChannelAutoDeleteService
from backend.services.channel.utils.message_utils import is_system_message
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.channel.forum_topic_service import ForumTopicService
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.base import TELEGRAM_API_TIMEOUT
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
            if is_system_message(message):
                return None
            if message.from_user and chat_type in ("group", "supergroup"):
                return await self.handle_group_comment(message, text_content)
            return None

        if not message.from_user:
            return None
        try:
            chat_svc = DirectChatService(self.db)
            msg_svc = DirectMessageService(self.db)

            await chat_svc.get_or_create_chat(
                bot_id=self.bot_model.id,
                tg_chat_id=message.chat.id,
                tg_user_id=message.from_user.id,
                tg_username=message.from_user.username,
                tg_first_name=message.from_user.first_name,
                tg_last_name=message.from_user.last_name,
            )
            msg_type = self.detect_message_type(message)
            await chat_svc.increment_unread(
                self.bot_model.id,
                message.chat.id,
                last_message_text=text_content,
                last_message_type=msg_type,
            )
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

    async def handle_group_comment(self, message: Message, text_content: Optional[str]) -> Optional[DirectChatWsEvent]:
        """Обработать комментарий в группе обсуждений: создать чат, сохранить сообщение, уведомить."""
        if not message.reply_to_message:
            return None

        try:
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
                return None

            chat_svc = DirectChatService(self.db)
            msg_svc = DirectMessageService(self.db)

            await chat_svc.get_or_create_chat(
                bot_id=self.bot_model.id,
                tg_chat_id=chat_id,
                tg_user_id=None,
                tg_first_name=message.chat.title,
                tg_username=None,
                tg_last_name=None,
            )

            reply_msg = message.reply_to_message
            existing_post = (await self.db.execute(
                select(BotMessageModel).where(
                    BotMessageModel.bot_id == self.bot_model.id,
                    BotMessageModel.chat_id == chat_id,
                    BotMessageModel.telegram_message_id == reply_msg.message_id,
                )
            )).scalar_one_or_none()

            if not existing_post:
                post_text = reply_msg.text or reply_msg.caption
                msg_type, media_file_id = msg_svc.extract_incoming_media(reply_msg)

                media_url = None
                if media_file_id:
                    try:
                        media_url = await msg_svc.resolve_media_url(
                            self.bot_model.token, media_file_id,
                        )
                    except Exception:
                        pass

                post_msg = BotMessageModel(
                    bot_id=self.bot_model.id,
                    telegram_message_id=reply_msg.message_id,
                    chat_id=chat_id,
                    user_id=None,
                    message_type=msg_type,
                    text_content=post_text,
                    media_file_id=media_file_id,
                    media_url=media_url,
                    is_incoming=True,
                    is_system=True,
                    raw_data=reply_msg.model_dump(),
                )
                self.db.add(post_msg)
                await self.db.flush()

            msg_type = self.detect_message_type(message)
            await chat_svc.increment_unread(
                self.bot_model.id,
                chat_id,
                last_message_text=text_content,
                last_message_type=msg_type,
            )

            self.saved_msg = await msg_svc.save_incoming_message(
                bot_id=self.bot_model.id,
                owner_id=self.bot_model.owner_id,
                message=message,
            )

            # Inbox notification
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
                    "reply_to_message_id": reply_msg.message_id,
                },
            })

            if self.saved_msg:
                await self.db.flush()
                await self.db.refresh(self.saved_msg)
                return DirectChatWsEvent(
                    user_id=self.bot_model.owner_id,
                    bot_id=self.bot_model.id,
                    chat_id=chat_id,
                    event_type="message_new",
                    payload={"message_id": self.saved_msg.id},
                )
        except Exception as e:
            logger.error("Failed to handle group comment: %s", e, exc_info=True)

        return None

    @staticmethod
    def detect_message_type(message: Message) -> MessageType:
        if message.photo:
            return MessageType.PHOTO
        if message.video:
            return MessageType.VIDEO
        if message.document:
            return MessageType.DOCUMENT
        if message.audio:
            return MessageType.AUDIO
        if message.voice:
            return MessageType.VOICE
        if message.animation:
            return MessageType.ANIMATION
        if message.sticker:
            return MessageType.STICKER
        return MessageType.TEXT

    async def process_side_effects(self, message: Message) -> None:
        """Обработка триггеров, автоответов, медиа и прочей логики."""
        text_content = message.text or message.caption
        chat_type = message.chat.type if message.chat else None
        saved_msg = self.saved_msg

        try:
            telegram_bot = resolve_by_token(self.bot_model.token)
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

            if message.chat.type == "private" and message.from_user:
                photo_url = await self.resolve_user_photo(message.from_user.id)
                if photo_url:
                    chat_svc = DirectChatService(self.db)
                    await chat_svc.update_photo(
                        self.bot_model.id, message.chat.id, photo_url,
                    )

            member_processor = MemberProcessor(self.db, self.bot_model, telegram_bot)

            if message.new_chat_members:
                await member_processor.handle_new_members(message)

            if message.left_chat_member:
                await member_processor.handle_member_left(message)

            await self.process_forum_topic_events(message)

            if text_content:
                text_processor = TextProcessor(self.db, self.bot_model, telegram_bot)
                await text_processor.process_text(
                    message, text_content, chat_type,
                )

            auto_delete_service = ChannelAutoDeleteService(self.db)
            await auto_delete_service.process_auto_delete(message, bot_id=self.bot_model.id)

        except Exception as e:
            logger.error(f"Side effects processing error: {e}", exc_info=True)

    async def resolve_user_photo(self, user_id: int) -> Optional[str]:
        """Получить URL аватара пользователя через Telegram API."""
        try:
            client = resolve_by_token(self.bot_model.token)
            photos = await client.get_user_profile_photos(user_id=user_id, limit=1)
            if photos.photos and photos.photos[0]:
                smallest = photos.photos[0][-1]
                tg_file = await client.get_file(smallest.file_id)
                if tg_file.file_path:
                    return f"https://api.telegram.org/file/bot{self.bot_model.token}/{tg_file.file_path}"
        except Exception as e:
            logger.debug(f"Could not resolve user photo for {user_id}: {e}")
        return None

    async def process_forum_topic_events(self, message: Message) -> None:
        chat_type = message.chat.type if message.chat else None
        if chat_type not in ("group", "supergroup"):
            return

        topic_created = message.forum_topic_created
        topic_edited = message.forum_topic_edited
        topic_closed = message.forum_topic_closed
        topic_reopened = message.forum_topic_reopened

        if not any([topic_created, topic_edited, topic_closed, topic_reopened]):
            return

        channel = await get_channel_by_telegram_id(
            self.db, message.chat.id, bot_id=self.bot_model.id,
        )
        if not channel:
            return

        service = ForumTopicService(self.db)
        thread_id = message.message_thread_id or 0

        try:
            if topic_created:
                await service.upsert_topic(
                    channel_id=channel.id,
                    thread_id=thread_id,
                    name=topic_created.name,
                    icon_color=topic_created.icon_color,
                    icon_custom_emoji_id=topic_created.icon_custom_emoji_id,
                )
            elif topic_edited:
                if topic_edited.name:
                    await service.upsert_topic(
                        channel_id=channel.id,
                        thread_id=thread_id,
                        name=topic_edited.name,
                        icon_custom_emoji_id=topic_edited.icon_custom_emoji_id,
                    )
            elif topic_closed:
                await service.close_topic(channel.id, thread_id)
            elif topic_reopened:
                await service.reopen_topic(channel.id, thread_id)
        except Exception as e:
            logger.error(f"Forum topic event error: {e}", exc_info=True)