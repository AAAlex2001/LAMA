from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, TriggerType
from backend.schemas.inbox.enums import EventType
from backend.services.bot.features.triggers.fire.fire_event import FireTriggerEvent
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.webhook.features.members.create_member_event import (
    CreateMemberEvent,
)


class DeleteMember:
    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot
        self.fire_event = FireTriggerEvent(db)

    async def execute(self, message: Message) -> None:
        member = message.left_chat_member
        if not member:
            return

        await self.fire_event.execute(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.MEMBER_LEFT,
            user_id=member.id,
            chat_id=message.chat.id,
            telegram_bot=self.telegram_bot,
            chat_type=message.chat.type if message.chat else None,
            context={
                "username": member.username,
                "first_name": member.first_name,
                "last_name": member.last_name,
            },
        )
        channel = await get_channel_by_telegram_id(
            self.db,
            message.chat.id,
            bot_id=self.bot_model.id,
        )
        await CreateMemberEvent(self.db, self.bot_model).execute(
            event_type=EventType.CHANNEL_MEMBER_LEFT,
            message=message,
            channel=channel,
            member=member,
            description_verb="покинул(а)",
        )
