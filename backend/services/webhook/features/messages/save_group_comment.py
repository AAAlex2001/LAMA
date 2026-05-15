import logging

from aiogram.types import Message
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.models.channels import ChannelGroup
from backend.schemas.direct.chat import DirectChatWsEvent
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.direct.features.chats.get_or_create_chat import GetOrCreateChat
from backend.services.direct.features.chats.increment_unread import IncrementUnread
from backend.services.direct.features.messages.save_incoming_message import SaveIncomingMessage
from backend.services.inbox.features.create_event import CreateInboxEvent
from backend.services.webhook.features.messages.save_system_message import SaveSystemMessage
from backend.services.webhook.types import DetectMessageType, SavedMessageResult

logger = logging.getLogger(__name__)


class SaveGroupComment:
    """Сохраняет комментарий пользователя в канале/группе."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, message: Message, text_content: str | None) -> SavedMessageResult:
        if not self.is_channel_comment(message):
            return SavedMessageResult()

        try:
            channel = await self.get_channel(message.chat.id)
            if not channel:
                return SavedMessageResult()

            await self.ensure_chat(message)
            await self.ensure_parent_post(message)
            message_type = DetectMessageType().execute(message)
            await IncrementUnread(self.db).execute(
                self.bot_model.id,
                message.chat.id,
                last_message_text=text_content,
                last_message_type=message_type,
            )
            saved_message = await SaveIncomingMessage(self.db).execute(
                bot_id=self.bot_model.id,
                message=message,
            )
            await self.create_inbox_event(message, text_content, channel)
            if not saved_message:
                return SavedMessageResult()

            ws_event = DirectChatWsEvent(
                user_id=self.bot_model.owner_id,
                bot_id=self.bot_model.id,
                chat_id=message.chat.id,
                event_type="message_new",
                payload={"message_id": saved_message.id},
            )
            return SavedMessageResult(ws_event=ws_event, saved_message=saved_message)
        except Exception as exc:
            logger.error("Failed to save group comment: %s", exc, exc_info=True)
            return SavedMessageResult()

    @staticmethod
    def is_channel_comment(message: Message) -> bool:
        if not message.reply_to_message or not message.from_user:
            return False
        reply_sender = message.reply_to_message.sender_chat
        return bool(reply_sender and reply_sender.type == "channel")

    async def get_channel(self, chat_id: int) -> ChannelGroup | None:
        channel_filter = or_(
            ChannelGroup.linked_chat_id == chat_id,
            ChannelGroup.telegram_id == chat_id,
        )
        result = await self.db.execute(
            select(ChannelGroup).where(
                ChannelGroup.owner_id == self.bot_model.owner_id,
                channel_filter,
            )
        )
        return result.scalar_one_or_none()

    async def ensure_chat(self, message: Message) -> None:
        await GetOrCreateChat(self.db).execute(
            bot_id=self.bot_model.id,
            tg_chat_id=message.chat.id,
            tg_user_id=None,
            tg_first_name=message.chat.title,
            tg_username=None,
            tg_last_name=None,
        )

    async def ensure_parent_post(self, message: Message) -> None:
        await SaveSystemMessage(self.db, self.bot_model).ensure_telegram_message(
            chat_id=message.chat.id,
            message=message.reply_to_message,
        )

    async def create_inbox_event(
        self,
        message: Message,
        text_content: str | None,
        channel: ChannelGroup,
    ) -> None:
        preview = text_content[:100] if text_content else "(медиа)"
        sender = message.from_user.username or str(message.from_user.id)
        await CreateInboxEvent(self.db).execute(
            InboxEventCreate(
                owner_id=self.bot_model.owner_id,
                category=InboxCategory.MODERATION,
                entity_type=EntityType.CHANNEL,
                event_type=EventType.CHANNEL_COMMENT,
                bot_id=self.bot_model.id,
                channel_id=channel.id,
                tg_user_id=message.from_user.id,
                tg_username=message.from_user.username,
                status=EventStatus.NEW,
                description=f"Комментарий от @{sender}: {preview}",
                payload={
                    "message_id": message.message_id,
                    "chat_id": message.chat.id,
                    "text": text_content[:500] if text_content else None,
                    "first_name": message.from_user.first_name,
                    "chat_title": message.chat.title,
                    "reply_to_message_id": message.reply_to_message.message_id,
                },
            )
        )
