import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.models.channels import ActionType
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.inbox.features.create_event import CreateInboxEvent

logger = logging.getLogger(__name__)


class CreateModerationEvent:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(
        self,
        message: Message,
        channel,
        action: ActionType,
        mute_duration: int | None,
        reason: str | None,
        reason_source: str | None,
        reason_context: dict | None,
    ) -> None:
        if action not in (ActionType.MUTE, ActionType.KICK, ActionType.BAN):
            return
        if not (message.from_user and channel):
            return

        try:
            message_text = self.get_message_text(message)
            payload = self.get_payload(
                message,
                action,
                mute_duration,
                message_text,
                reason,
                reason_source,
                reason_context,
            )
            await CreateInboxEvent(self.db).execute(
                InboxEventCreate(
                    owner_id=self.bot_model.owner_id,
                    category=InboxCategory.SYSTEM,
                    entity_type=EntityType.CHANNEL,
                    event_type=EventType.CHANNEL_BAN,
                    bot_id=self.bot_model.id,
                    channel_id=channel.id,
                    tg_user_id=message.from_user.id,
                    tg_username=message.from_user.username,
                    status=EventStatus.NEW,
                    description=message_text
                    or f"Автомодерация пользователя {message.from_user.id}",
                    payload=payload,
                )
            )
        except Exception as exc:
            logger.error("Failed to create moderation inbox event: %s", exc, exc_info=True)
            raise

    @staticmethod
    def get_message_text(message: Message) -> str:
        message_text = (message.text or message.caption or "").strip()
        if len(message_text) > 500:
            return f"{message_text[:497]}..."
        return message_text

    @staticmethod
    def get_payload(
        message: Message,
        action: ActionType,
        mute_duration: int | None,
        message_text: str,
        reason: str | None,
        reason_source: str | None,
        reason_context: dict | None,
    ) -> dict:
        payload = {
            "ban_type": "mute" if action == ActionType.MUTE else "ban",
            "is_unbanned": False,
            "duration_minutes": mute_duration,
            "chat_id": message.chat.id,
            "message_id": message.message_id,
            "message_text": message_text or None,
            "block_reason": reason,
            "reason": reason,
            "reason_source": reason_source,
            "action": action.value,
            "automatic": True,
        }
        if reason_context:
            payload["reason_context"] = reason_context
        return payload
