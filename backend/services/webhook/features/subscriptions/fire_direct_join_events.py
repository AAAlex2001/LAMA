from aiogram.types import ChatMemberUpdated, User
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, TriggerType
from backend.services.bot.features.triggers.fire.fire_event import FireTriggerEvent


class FireDirectJoinEvents:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.bot_model = bot_model
        self.fire_event = FireTriggerEvent(db)

    async def execute(
        self,
        chat_member: ChatMemberUpdated,
        member: User,
        telegram_bot,
        link_url: str | None,
    ) -> None:
        base_context = {
            "username": member.username,
            "first_name": member.first_name,
            "chat_title": chat_member.chat.title,
            "link_url": link_url,
        }
        await self.fire_event.execute(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.JOIN_REQUEST_CREATED,
            user_id=member.id,
            chat_id=chat_member.chat.id,
            telegram_bot=telegram_bot,
            chat_type=chat_member.chat.type,
            context=base_context,
        )

        approved_context = dict(base_context)
        approved_context["auto_approved"] = True
        await self.fire_event.execute(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.JOIN_REQUEST_APPROVED,
            user_id=member.id,
            chat_id=chat_member.chat.id,
            telegram_bot=telegram_bot,
            chat_type=chat_member.chat.type,
            context=approved_context,
        )
