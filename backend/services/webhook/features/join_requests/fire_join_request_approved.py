from aiogram.types import ChatJoinRequest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, TriggerType
from backend.services.bot.features.triggers.fire.fire_event import FireTriggerEvent


class FireJoinRequestApproved:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.bot_model = bot_model
        self.fire_event = FireTriggerEvent(db)

    async def execute(self, join_request: ChatJoinRequest, telegram_bot) -> None:
        await self.fire_event.execute(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.JOIN_REQUEST_APPROVED,
            user_id=join_request.from_user.id,
            chat_id=join_request.chat.id,
            telegram_bot=telegram_bot,
            chat_type=join_request.chat.type,
            context={
                "username": join_request.from_user.username,
                "first_name": join_request.from_user.first_name,
            },
        )
