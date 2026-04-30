import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, CaptchaMode, TriggerType
from backend.schemas.inbox.enums import EventType
from backend.services.bot.features.triggers.fire.fire_event import FireTriggerEvent
from backend.services.bot_provider import get_bot_info
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.webhook.features.members.create_member_event import (
    CreateMemberEvent,
)
from backend.services.webhook.features.members.send_group_captcha import (
    SendGroupCaptcha,
)
from backend.services.webhook.features.welcome.send_welcome_message import SendWelcomeMessage

logger = logging.getLogger(__name__)


class UpdateMember:
    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot
        self.fire_event = FireTriggerEvent(db)
        self.welcome = SendWelcomeMessage(db, bot_model)

    async def execute(self, message: Message) -> None:
        if not message.new_chat_members:
            return

        bot_id = await self.get_bot_id()
        channel = await get_channel_by_telegram_id(
            self.db,
            message.chat.id,
            bot_id=self.bot_model.id,
        )

        for member in message.new_chat_members:
            if bot_id and member.id == bot_id:
                logger.info("Skipping captcha for bot itself (id=%s)", bot_id)
                continue

            await self.greet_or_send_captcha(message, member, channel)
            await self.fire_event.execute(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.MEMBER_JOINED,
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
            await CreateMemberEvent(self.db, self.bot_model).execute(
                event_type=EventType.CHANNEL_MEMBER_JOINED,
                message=message,
                channel=channel,
                member=member,
                description_verb="вступил(а) в",
            )

    async def greet_or_send_captcha(self, message: Message, member, channel) -> None:
        if channel and channel.captcha_enabled:
            await SendGroupCaptcha(self.db, self.bot_model, self.telegram_bot).execute(
                message,
                member,
                channel,
            )
            return

        captcha_mode = getattr(self.bot_model, "captcha_mode", CaptchaMode.DISABLED)
        if captcha_mode in (CaptchaMode.AFTER_JOIN, CaptchaMode.BOTH):
            await SendGroupCaptcha(self.db, self.bot_model, self.telegram_bot).execute(
                message,
                member,
            )
            return

        await self.welcome.to_new_member(message, member)

    async def get_bot_id(self) -> int | None:
        if self.bot_model.telegram_id:
            return self.bot_model.telegram_id
        try:
            bot_info = await get_bot_info(self.bot_model.token)
            return bot_info.id
        except Exception as exc:
            logger.error("Failed to get bot info: %s", exc, exc_info=True)
            return None
