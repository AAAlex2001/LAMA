import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.inbox.features.create_event import CreateInboxEvent

logger = logging.getLogger(__name__)


class CreateAutoReplyEvent:
    """InboxEvent типа SYSTEM_AUTOREPLY после auto-reply."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, message: Message, text_content: str, auto_reply) -> None:
        try:
            channel = await get_channel_by_telegram_id(
                self.db,
                message.chat.id,
                bot_id=self.bot_model.id,
            )
            await CreateInboxEvent(self.db).execute(
                InboxEventCreate(
                    owner_id=self.bot_model.owner_id,
                    category=InboxCategory.AUTOMATION,
                    entity_type=EntityType.BOT,
                    event_type=EventType.SYSTEM_AUTOREPLY,
                    bot_id=self.bot_model.id,
                    channel_id=channel.id if channel else None,
                    tg_user_id=message.from_user.id if message.from_user else None,
                    tg_username=message.from_user.username if message.from_user else None,
                    status=EventStatus.NEW,
                    description=(
                        f"Сработал автоответ для сообщения в чате {message.chat.id}"
                    ),
                    payload={
                        "chat_id": message.chat.id,
                        "message_id": message.message_id,
                        "text": text_content,
                        "auto_reply_id": auto_reply.id,
                        "keywords": auto_reply.keywords,
                    },
                )
            )
        except Exception as exc:
            logger.error(
                "Failed to create inbox event for auto reply execution: %s",
                exc,
                exc_info=True,
            )
