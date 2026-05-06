import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.models.channels import ActionType
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.inbox.features.create_event import CreateInboxEvent

logger = logging.getLogger(__name__)

EVENTABLE_ACTIONS = (ActionType.MUTE, ActionType.KICK, ActionType.BAN)
TEXT_LIMIT = 500


class CreateModerationEvent:
    """Создать inbox-событие об автомодерации пользователя."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(
        self,
        channel_id: int,
        chat_id: int,
        message_id: int,
        user_id: int,
        username: str | None,
        message_text: str | None,
        action: ActionType,
        mute_duration: int | None,
        reason: str | None,
        reason_source: str | None,
        reason_context: dict | None,
    ) -> None:
        if action not in EVENTABLE_ACTIONS:
            return

        text = (message_text or "").strip()
        if len(text) > TEXT_LIMIT:
            text = f"{text[: TEXT_LIMIT - 3]}..."

        payload = {
            "ban_type": "mute" if action == ActionType.MUTE else "ban",
            "is_unbanned": False,
            "duration_minutes": mute_duration,
            "chat_id": chat_id,
            "message_id": message_id,
            "message_text": text or None,
            "block_reason": reason,
            "reason": reason,
            "reason_source": reason_source,
            "action": action.value,
            "automatic": True,
        }
        if reason_context:
            payload["reason_context"] = reason_context

        await CreateInboxEvent(self.db).execute(
            InboxEventCreate(
                owner_id=self.bot_model.owner_id,
                category=InboxCategory.SYSTEM,
                entity_type=EntityType.CHANNEL,
                event_type=EventType.CHANNEL_BAN,
                bot_id=self.bot_model.id,
                channel_id=channel_id,
                tg_user_id=user_id,
                tg_username=username,
                status=EventStatus.NEW,
                description=text or f"Автомодерация пользователя {user_id}",
                payload=payload,
            )
        )
