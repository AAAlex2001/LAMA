import logging
from typing import Optional, Dict, Any

from aiogram.types import Message
from aiogram import Bot
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.channel import ChannelAutoDeleteService
from backend.services.bot import AutoReplyService, TriggerService, ShortcodeProcessor
from backend.models.bots import Bot as BotModel, TriggerType, MessageType
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.services.inbox.action_service import InboxActionService
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.utils import build_keyboard
from backend.services.webhook.messages.commands import CommandProcessor

logger = logging.getLogger(__name__)


class TextProcessor:
    def __init__(
        self, db: AsyncSession, bot_model: BotModel, telegram_bot: Bot
    ):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot
        self.trigger_service = TriggerService(db)
        self.command_processor = CommandProcessor(db, bot_model, telegram_bot)

    def build_shortcode_context(self, message: Message) -> Dict[str, Any]:
        """Построить контекст для шорткодов"""
        from_user = message.from_user
        return {
            "user": {
                "id": from_user.id if from_user else None,
                "first_name": from_user.first_name if from_user else "",
                "username": from_user.username if from_user else None
            },
            "bot": {"first_name": self.bot_model.first_name}
        }

    async def send_response(
        self,
        chat_id: int,
        text: str,
        media_url: Optional[str] = None,
        media_type: Optional[MessageType] = None,
        buttons: Optional[Dict[str, Any]] = None,
    ) -> Optional[Message]:
        """Универсальная отправка ответа (текст/медиа + кнопки)"""
        reply_markup = build_keyboard(buttons)

        if media_url and media_type:
            send_methods = {
                MessageType.PHOTO: self.telegram_bot.send_photo,
                MessageType.VIDEO: self.telegram_bot.send_video,
                MessageType.DOCUMENT: self.telegram_bot.send_document,
            }

            method = send_methods.get(media_type)
            if method:
                media_param = {
                    MessageType.PHOTO: "photo",
                    MessageType.VIDEO: "video",
                    MessageType.DOCUMENT: "document",
                }[media_type]

                return await method(
                    chat_id=chat_id,
                    **{media_param: media_url},
                    caption=text,
                    reply_markup=reply_markup
                )

        return await self.telegram_bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_markup=reply_markup
        )

    async def send_auto_reply_response(
        self, message: Message, auto_reply
    ) -> None:
        """Отправить автоответ"""
        context = self.build_shortcode_context(message)
        text = ShortcodeProcessor.process(auto_reply.response_text, context)

        await self.send_response(
            chat_id=message.chat.id,
            text=text,
            media_url=auto_reply.response_media_url,
            media_type=auto_reply.response_media_type,
            buttons=auto_reply.response_buttons,
        )

    async def process_text(
        self,
        message: Message,
        text_content: str,
        chat_type: Optional[str],
        auto_delete_service: ChannelAutoDeleteService
    ) -> None:
        """Обработка текстового сообщения"""
        if text_content.startswith("/"):
            await self.command_processor.process_command(
                message, text_content, chat_type, auto_delete_service
            )
            return

        user_id = message.from_user.id if message.from_user else 0
        triggered_count = await self.trigger_service.fire_event(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.USER_MESSAGE,
            user_id=user_id,
            chat_id=message.chat.id,
            telegram_bot=self.telegram_bot,
            chat_type=message.chat.type if message.chat else None,
            context={"text": text_content[:100]}
        )

        if triggered_count > 0:
            try:
                inbox_service = InboxActionService(self.db)
                channel_obj = await get_channel_by_telegram_id(self.db, message.chat.id)
                channel_id = channel_obj.id if channel_obj else None

                await inbox_service.create_event({
                    "owner_id": self.bot_model.owner_id,
                    "category": InboxCategory.AUTOMATION,
                    "entity_type": EntityType.BOT,
                    "event_type": EventType.SYSTEM_TRIGGER,
                    "bot_id": self.bot_model.id,
                    "channel_id": channel_id,
                    "tg_user_id": message.from_user.id if message.from_user else None,
                    "tg_username": message.from_user.username if message.from_user else None,
                    "status": EventStatus.NEW,
                    "description": f"Сработал триггер для сообщения в чате {message.chat.id}",
                    "payload": {
                        "chat_id": message.chat.id,
                        "message_id": message.message_id,
                        "text": text_content,
                        "triggered_count": triggered_count,
                    },
                })
            except Exception as e:
                logger.error(f"Failed to create inbox event for trigger execution: {e}", exc_info=True)

        auto_reply_service = AutoReplyService(self.db)
        auto_reply = await auto_reply_service.find_by_text(
            self.bot_model.id,
            text_content,
            chat_type=chat_type
        )

        logger.info(
            f"Auto-reply lookup: bot_id={self.bot_model.id}, "
            f"text={text_content[:50]}, chat_type={chat_type}, "
            f"found={auto_reply is not None}"
        )

        if auto_reply:
            await self.send_auto_reply_response(message, auto_reply)

            try:
                inbox_service = InboxActionService(self.db)
                channel_obj = await get_channel_by_telegram_id(self.db, message.chat.id)
                channel_id = channel_obj.id if channel_obj else None

                await inbox_service.create_event({
                    "owner_id": self.bot_model.owner_id,
                    "category": InboxCategory.AUTOMATION,
                    "entity_type": EntityType.BOT,
                    "event_type": EventType.SYSTEM_AUTOREPLY,
                    "bot_id": self.bot_model.id,
                    "channel_id": channel_id,
                    "tg_user_id": message.from_user.id if message.from_user else None,
                    "tg_username": message.from_user.username if message.from_user else None,
                    "status": EventStatus.NEW,
                    "description": f"Сработал автоответ для сообщения в чате {message.chat.id}",
                    "payload": {
                        "chat_id": message.chat.id,
                        "message_id": message.message_id,
                        "text": text_content,
                        "auto_reply_id": auto_reply.id,
                        "keywords": auto_reply.keywords,
                    },
                })
            except Exception as e:
                logger.error(f"Failed to create inbox event for auto reply execution: {e}", exc_info=True)
