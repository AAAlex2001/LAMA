import logging
from dataclasses import dataclass
from typing import Any

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.schemas.direct.chat import DirectChatWsEvent
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.direct.features.chats.get_or_create_chat import GetOrCreateChat
from backend.services.direct.features.chats.increment_unread import IncrementUnread
from backend.services.direct.features.messages.save_incoming_message import SaveIncomingMessage
from backend.services.inbox.features.create_event import CreateInboxEvent
from backend.services.webhook.types import DetectMessageType, SavedMessageResult

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class ReplyContext:
    """Контекст reply_to_message для save_private_message."""

    suffix: str
    payload: dict[str, Any]


class SavePrivateMessage:
    """Сохраняет входящее DM-сообщение, обновляет чат, шлёт WS."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, message: Message, text_content: str | None) -> SavedMessageResult:
        if not message.from_user:
            return SavedMessageResult()

        try:
            await GetOrCreateChat(self.db).execute(
                bot_id=self.bot_model.id,
                tg_chat_id=message.chat.id,
                tg_user_id=message.from_user.id,
                tg_username=message.from_user.username,
                tg_first_name=message.from_user.first_name,
                tg_last_name=message.from_user.last_name,
            )
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
            if not (text_content and text_content.startswith("/")):
                await self.create_inbox_event(message, text_content)
            if not saved_message:
                return SavedMessageResult()

            return SavedMessageResult(
                ws_event=DirectChatWsEvent(
                    user_id=self.bot_model.owner_id,
                    bot_id=self.bot_model.id,
                    chat_id=message.chat.id,
                    event_type="message_new",
                    payload={"message_id": saved_message.id},
                ),
                saved_message=saved_message,
            )
        except Exception as exc:
            logger.error("Message save error: %s", exc, exc_info=True)
            return SavedMessageResult()

    async def create_inbox_event(
        self,
        message: Message,
        text_content: str | None,
    ) -> None:
        if not message.from_user:
            return

        preview = text_content[:100] if text_content else "(медиа)"
        sender = message.from_user.username or str(message.from_user.id)
        reply_context = self.get_reply_context(message)
        payload = {
            "message_id": message.message_id,
            "chat_id": message.chat.id,
            "text": text_content[:500] if text_content else None,
            "first_name": message.from_user.first_name,
            "media_file_id": self.get_media_file_id(message),
        }
        payload.update(reply_context.payload)
        await CreateInboxEvent(self.db).execute(
            InboxEventCreate(
                owner_id=self.bot_model.owner_id,
                category=InboxCategory.MODERATION,
                entity_type=EntityType.BOT,
                event_type=EventType.BOT_MESSAGE,
                bot_id=self.bot_model.id,
                tg_user_id=message.from_user.id,
                tg_username=message.from_user.username,
                status=EventStatus.NEW,
                description=f"Сообщение от @{sender}: {preview}{reply_context.suffix}",
                payload=payload,
            )
        )

    def get_reply_context(self, message: Message) -> ReplyContext:
        reply = message.reply_to_message
        if not reply:
            return ReplyContext(suffix="", payload={})

        user = reply.from_user
        if not user:
            return ReplyContext(
                suffix="",
                payload={"reply_to_message_id": reply.message_id},
            )

        text = (reply.text or reply.caption or "").strip()
        preview = f"{text[:60]}..." if len(text) > 60 else text
        name = user.username or user.first_name or str(user.id)
        if getattr(user, "is_bot", False):
            name = self.bot_model.username or self.bot_model.first_name or name

        suffix = f"; ответ на @{name}: {preview}" if preview else f"; ответ на @{name}"
        return ReplyContext(
            suffix=suffix,
            payload={
                "reply_to_message_id": reply.message_id,
                "reply_to_username": user.username,
                "reply_to_first_name": user.first_name,
                "reply_to_is_bot": bool(getattr(user, "is_bot", False)),
                "reply_to_text": text[:500] if text else None,
            },
        )

    @staticmethod
    def get_media_file_id(message: Message) -> str | None:
        if message.photo:
            return message.photo[-1].file_id
        if message.video:
            return message.video.file_id
        if message.document:
            return message.document.file_id
        return None
