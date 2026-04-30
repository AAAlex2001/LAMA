import logging

from aiogram.types import Message, User
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.inbox.features.create_event import CreateInboxEvent

logger = logging.getLogger(__name__)


class CreateMemberEvent:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(
        self,
        event_type: EventType,
        message: Message,
        channel,
        member: User,
        description_verb: str,
    ) -> None:
        try:
            chat_title = message.chat.title or f"чат {message.chat.id}"
            member_display = (
                f"@{member.username}" if member.username else member.first_name or str(member.id)
            )
            await CreateInboxEvent(self.db).execute(
                InboxEventCreate(
                    owner_id=self.bot_model.owner_id,
                    category=InboxCategory.SYSTEM,
                    entity_type=EntityType.CHANNEL,
                    event_type=event_type,
                    bot_id=self.bot_model.id,
                    channel_id=channel.id if channel else None,
                    tg_user_id=member.id,
                    tg_username=member.username,
                    status=EventStatus.NEW,
                    description=f"{member_display} {description_verb} {chat_title}",
                    payload={
                        "message_id": message.message_id,
                        "chat_id": message.chat.id,
                        "chat_title": message.chat.title,
                        "chat_type": message.chat.type,
                        "user_id": member.id,
                        "username": member.username,
                        "first_name": member.first_name,
                        "last_name": member.last_name,
                    },
                )
            )
        except Exception as exc:
            logger.error("Failed to create member event: %s", exc, exc_info=True)
