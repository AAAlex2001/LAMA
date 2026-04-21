import logging
from typing import Optional, List, Dict, Any

from aiogram.types import Message, InputMediaPhoto, InputMediaVideo, InputMediaDocument
from backend.services.telegram_client import RateLimitedBot
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot import AutoReplyService, TriggerService, ShortcodeProcessor
from backend.models.bots import Bot as BotModel, TriggerType, MessageType, BotMessage
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.direct.message_service import DirectMessageService
from backend.services.inbox.event_service import InboxEventService
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.utils import build_keyboard
from backend.services.webhook.messages.commands import CommandProcessor
from backend.utils.media import is_video_url, is_document_url

logger = logging.getLogger(__name__)


class TextProcessor:
    def __init__(
        self, db: AsyncSession, bot_model: BotModel, telegram_bot: RateLimitedBot
    ):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot
        self.trigger_service = TriggerService(db)
        self.command_processor = CommandProcessor(db, bot_model, telegram_bot)

    async def resolve_channel(self, chat_id: int):
        """Получить канал по telegram_id (кешируется на время обработки)."""
        if not hasattr(self, 'resolved_channels'):
            self.resolved_channels = {}
        if chat_id not in self.resolved_channels:
            self.resolved_channels[chat_id] = await get_channel_by_telegram_id(self.db, chat_id)
        return self.resolved_channels[chat_id]

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

    async def save_system_message(self, chat_id: int, text: str) -> None:
        """Сохранить системное сообщение в БД (для DM чатов)."""
        msg = BotMessage(
            bot_id=self.bot_model.id,
            telegram_message_id=0,
            chat_id=chat_id,
            user_id=None,
            message_type=MessageType.TEXT,
            text_content=text,
            is_incoming=False,
            is_system=True,
        )
        self.db.add(msg)
        await self.db.flush()

    async def send_response(
        self,
        chat_id: int,
        text: str,
        media_url: Optional[str] = None,
        media_urls: Optional[List[str]] = None,
        media_type: Optional[MessageType] = None,
        buttons: Optional[Dict[str, Any]] = None,
    ) -> Optional[Message]:
        """Универсальная отправка ответа (текст/медиа/альбом + кнопки)"""
        reply_markup = build_keyboard(buttons)

        all_urls = [u for u in (media_urls or []) if u]
        if not all_urls and media_url:
            all_urls = [media_url]

        if len(all_urls) > 1:
            media_group = []
            for i, url in enumerate(all_urls[:10]):
                caption = text if i == 0 else None
                if is_video_url(url):
                    media_group.append(InputMediaVideo(media=url, caption=caption))
                elif is_document_url(url):
                    media_group.append(InputMediaDocument(media=url, caption=caption))
                else:
                    media_group.append(InputMediaPhoto(media=url, caption=caption))
            await self.telegram_bot.send_media_group(chat_id=chat_id, media=media_group)
            if reply_markup:
                await self.telegram_bot.send_message(
                    chat_id=chat_id,
                    text="\u200b",
                    reply_markup=reply_markup,
                )
            return None

        if all_urls and media_type:
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
                    **{media_param: all_urls[0]},
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

        sent_message = await self.send_response(
            chat_id=message.chat.id,
            text=text,
            media_url=auto_reply.response_media_url,
            media_urls=getattr(auto_reply, "response_media_urls", None),
            media_type=auto_reply.response_media_type,
            buttons=auto_reply.response_buttons,
        )

        await self.save_outgoing_if_dm(
            chat_id=message.chat.id,
            tg_message=sent_message,
            fallback_type=auto_reply.response_media_type or MessageType.TEXT,
            fallback_media_url=auto_reply.response_media_url,
        )

    async def save_outgoing_if_dm(
        self,
        chat_id: int,
        tg_message: Optional[Message],
        fallback_type: MessageType,
        fallback_media_url: Optional[str],
    ) -> None:
        """Сохранить исходящее сообщение бота в BotMessage (только DM)."""
        if not tg_message or chat_id <= 0:
            return
        try:
            direct_service = DirectMessageService(self.db)
            await direct_service.save_outgoing_message(
                bot_id=self.bot_model.id,
                tg_chat_id=chat_id,
                tg_message=tg_message,
                fallback_type=fallback_type,
                fallback_media_url=fallback_media_url,
            )
            await self.db.flush()
        except Exception as e:
            logger.error(f"Failed to save outgoing bot message: {e}", exc_info=True)

    async def process_text(
        self,
        message: Message,
        text_content: str,
        chat_type: Optional[str],
    ) -> None:
        """Обработка текстового сообщения"""
        if text_content.startswith("/"):
            await self.command_processor.process_command(
                message, text_content, chat_type,
            )
            return

        user_id = message.from_user.id if message.from_user else 0
        trigger_summary = await self.trigger_service.fire_event_with_summary(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.USER_MESSAGE,
            user_id=user_id,
            chat_id=message.chat.id,
            telegram_bot=self.telegram_bot,
            chat_type=message.chat.type if message.chat else None,
            context={
                "text": text_content[:100],
                "message_text": text_content[:500],
                "message_id": message.message_id,
                "username": message.from_user.username if message.from_user else None,
            }
        )
        triggered_count = trigger_summary.executed_count

        if triggered_count > 0:
            trigger_reason = trigger_summary.build_reason()
            if message.chat.type == "private":
                try:
                    await self.save_system_message(
                        chat_id=message.chat.id,
                        text=f"Сработал триггер ({triggered_count})",
                    )
                except Exception as e:
                    logger.error(f"Failed to save system message for trigger: {e}", exc_info=True)

            try:
                event_service = InboxEventService(self.db)
                channel_obj = await self.resolve_channel(message.chat.id)
                channel_id = channel_obj.id if channel_obj else None

                await event_service.create_event(InboxEventCreate(
                    owner_id=self.bot_model.owner_id,
                    category=InboxCategory.AUTOMATION,
                    entity_type=EntityType.BOT,
                    event_type=EventType.SYSTEM_TRIGGER,
                    bot_id=self.bot_model.id,
                    channel_id=channel_id,
                    tg_user_id=message.from_user.id if message.from_user else None,
                    tg_username=message.from_user.username if message.from_user else None,
                    status=EventStatus.NEW,
                    description=trigger_reason or f"Сработал триггер для сообщения в чате {message.chat.id}",
                    payload={
                        "chat_id": message.chat.id,
                        "message_id": message.message_id,
                        "text": text_content,
                        "triggered_count": triggered_count,
                        "trigger_ids": trigger_summary.trigger_ids,
                        "trigger_names": trigger_summary.trigger_names,
                        "reason": trigger_reason,
                        "reason_source": "trigger",
                    },
                ))
            except Exception as e:
                logger.error(f"Failed to create inbox event for trigger execution: {e}", exc_info=True)

        auto_reply_service = AutoReplyService(self.db)
        channel_obj = await self.resolve_channel(message.chat.id)
        auto_reply = await auto_reply_service.find_by_text(
            self.bot_model.id,
            text_content,
            chat_type=chat_type,
            channel_id=channel_obj.id if channel_obj else None,
            chat_id=message.chat.id,
            user_id=message.from_user.id if message.from_user else None,
        )

        logger.info(
            f"Auto-reply lookup: bot_id={self.bot_model.id}, "
            f"text={text_content[:50]}, chat_type={chat_type}, "
            f"found={auto_reply is not None}"
        )

        if auto_reply:
            await self.send_auto_reply_response(message, auto_reply)

            if message.chat.type == "private":
                try:
                    matched = ", ".join(auto_reply.keywords) if auto_reply.keywords else ""
                    await self.save_system_message(
                        chat_id=message.chat.id,
                        text=f'Сработал автоответ "{matched}"',
                    )
                except Exception as e:
                    logger.error(f"Failed to save system message for auto-reply: {e}", exc_info=True)

            try:
                event_service = InboxEventService(self.db)
                channel_obj = await self.resolve_channel(message.chat.id)
                channel_id = channel_obj.id if channel_obj else None

                await event_service.create_event(InboxEventCreate(
                    owner_id=self.bot_model.owner_id,
                    category=InboxCategory.AUTOMATION,
                    entity_type=EntityType.BOT,
                    event_type=EventType.SYSTEM_AUTOREPLY,
                    bot_id=self.bot_model.id,
                    channel_id=channel_id,
                    tg_user_id=message.from_user.id if message.from_user else None,
                    tg_username=message.from_user.username if message.from_user else None,
                    status=EventStatus.NEW,
                    description=f"Сработал автоответ для сообщения в чате {message.chat.id}",
                    payload={
                        "chat_id": message.chat.id,
                        "message_id": message.message_id,
                        "text": text_content,
                        "auto_reply_id": auto_reply.id,
                        "keywords": auto_reply.keywords,
                    },
                ))
            except Exception as e:
                logger.error(f"Failed to create inbox event for auto reply execution: {e}", exc_info=True)
