import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, TriggerType
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.bot.features.triggers.fire.fire_event_with_summary import (
    FireTriggerEventWithSummary,
)
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.inbox.features.create_event import CreateInboxEvent

logger = logging.getLogger(__name__)


class FireCommandTriggers:
    """Запускает триггеры с типом COMMAND_CALLED."""

    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot
        self.fire_event = FireTriggerEventWithSummary(db)

    async def execute(
        self,
        message: Message,
        command_text: str,
        text_content: str,
    ) -> None:
        user_id = message.from_user.id if message.from_user else 0
        summary = await self.fire_event.execute(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.COMMAND_CALLED,
            user_id=user_id,
            chat_id=message.chat.id,
            telegram_bot=self.telegram_bot,
            chat_type=message.chat.type if message.chat else None,
            context={
                "command": command_text,
                "message_id": message.message_id,
                "message_text": text_content[:500] if text_content else None,
                "username": message.from_user.username if message.from_user else None,
            },
        )
        if summary.executed_count <= 0:
            return

        try:
            await self.create_event(message, command_text, summary)
        except Exception as exc:
            logger.error(
                "Failed to create inbox event for trigger execution on command: %s",
                exc,
                exc_info=True,
            )

    async def create_event(self, message: Message, command_text: str, summary) -> None:
        channel = await get_channel_by_telegram_id(
            self.db,
            message.chat.id,
            bot_id=self.bot_model.id,
        )
        reason = summary.build_reason()
        await CreateInboxEvent(self.db).execute(
            InboxEventCreate(
                owner_id=self.bot_model.owner_id,
                category=InboxCategory.AUTOMATION,
                entity_type=EntityType.BOT,
                event_type=EventType.SYSTEM_TRIGGER,
                bot_id=self.bot_model.id,
                channel_id=channel.id if channel else None,
                tg_user_id=message.from_user.id if message.from_user else None,
                tg_username=message.from_user.username if message.from_user else None,
                status=EventStatus.NEW,
                description=reason
                or (
                    f"Сработал триггер ({summary.executed_count}) "
                    f"для команды {command_text} в чате {message.chat.id}"
                ),
                payload={
                    "chat_id": message.chat.id,
                    "message_id": message.message_id,
                    "command": command_text,
                    "triggered_count": summary.executed_count,
                    "trigger_ids": summary.trigger_ids,
                    "trigger_names": summary.trigger_names,
                    "reason": reason,
                    "reason_source": "trigger",
                },
            )
        )
