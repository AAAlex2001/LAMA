import logging
from dataclasses import dataclass

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.inbox.features.create_event import CreateInboxEvent

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChatMetadataEvent:
    """Описание события об изменении метаданных чата (фото, название)."""

    event_type: EventType
    description: str
    payload: dict


class CreateChatMetadataEvents:
    """Создаёт InboxEvent при изменении title/photo/etc. в чате."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, message: Message) -> None:
        chat_type = message.chat.type if message.chat else None
        if chat_type not in ("group", "supergroup", "channel"):
            return

        events = self.get_events(message)
        if not events:
            return

        channel = await get_channel_by_telegram_id(
            self.db,
            message.chat.id,
            bot_id=self.bot_model.id,
        )
        initiator = message.from_user
        event_service = CreateInboxEvent(self.db)

        try:
            for event in events:
                await event_service.execute(
                    InboxEventCreate(
                        owner_id=self.bot_model.owner_id,
                        category=InboxCategory.SYSTEM,
                        entity_type=EntityType.CHANNEL,
                        event_type=event.event_type,
                        bot_id=self.bot_model.id,
                        channel_id=channel.id if channel else None,
                        tg_user_id=initiator.id if initiator else None,
                        tg_username=initiator.username if initiator else None,
                        status=EventStatus.NEW,
                        description=event.description,
                        payload=self.get_payload(message, chat_type, event),
                    )
                )
        except Exception as exc:
            logger.error("Failed to create chat metadata event: %s", exc, exc_info=True)

    def get_events(self, message: Message) -> list[ChatMetadataEvent]:
        initiator_display = self.get_initiator_display(message)
        chat_title = message.chat.title or f"Чат {message.chat.id}"
        base_payload = {"message_id": message.message_id, "chat_id": message.chat.id}
        events: list[ChatMetadataEvent] = []

        if message.new_chat_title:
            events.append(
                ChatMetadataEvent(
                    event_type=EventType.CHANNEL_TITLE_CHANGED,
                    description=f"{initiator_display} сменил(а) название на «{message.new_chat_title}»".strip(),
                    payload=base_payload | {"new_title": message.new_chat_title},
                )
            )

        if message.new_chat_photo:
            events.append(
                ChatMetadataEvent(
                    event_type=EventType.CHANNEL_PHOTO_CHANGED,
                    description=f"{initiator_display} обновил(а) аватар {chat_title}".strip(),
                    payload=base_payload | {
                        "photo_deleted": False,
                        "file_ids": [
                            photo.file_id
                            for photo in message.new_chat_photo
                            if getattr(photo, "file_id", None)
                        ],
                    },
                )
            )

        if message.delete_chat_photo:
            events.append(
                ChatMetadataEvent(
                    event_type=EventType.CHANNEL_PHOTO_CHANGED,
                    description=f"{initiator_display} удалил(а) аватар {chat_title}".strip(),
                    payload=base_payload | {"photo_deleted": True},
                )
            )

        if message.pinned_message:
            events.append(
                ChatMetadataEvent(
                    event_type=EventType.CHANNEL_PINNED_MESSAGE,
                    description=f"{initiator_display} закрепил(а) сообщение в {chat_title}".strip(),
                    payload=base_payload | {
                        "pinned_message_id": message.pinned_message.message_id,
                        "pinned_preview": self.get_pinned_preview(message) or None,
                    },
                )
            )

        return events

    @staticmethod
    def get_payload(message: Message, chat_type: str, event: ChatMetadataEvent) -> dict:
        initiator = message.from_user
        return {
            "chat_title": message.chat.title,
            "chat_type": chat_type,
            "initiator_id": initiator.id if initiator else None,
            "initiator_username": initiator.username if initiator else None,
        } | event.payload

    @staticmethod
    def get_initiator_display(message: Message) -> str:
        initiator = message.from_user
        if initiator and initiator.username:
            return f"@{initiator.username}"
        if initiator and initiator.first_name:
            return initiator.first_name
        return "Участник"

    @staticmethod
    def get_pinned_preview(message: Message) -> str:
        pinned_message = message.pinned_message
        if not pinned_message:
            return ""

        preview = (pinned_message.text or pinned_message.caption or "").strip()
        if len(preview) > 200:
            return f"{preview[:197]}..."
        return preview
