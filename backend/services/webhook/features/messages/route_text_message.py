import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, TriggerType
from backend.services.bot.features.auto_replies.find_by_text import FindAutoReplyByText
from backend.services.bot.features.triggers.fire.fire_event_with_summary import (
    FireTriggerEventWithSummary,
)
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.webhook.features.commands.route_bot_command import RouteBotCommand
from backend.services.webhook.features.messages.create_auto_reply_event import (
    CreateAutoReplyEvent,
)
from backend.services.webhook.features.messages.create_text_trigger_event import (
    CreateTextTriggerEvent,
)
from backend.services.webhook.features.messages.save_system_message import (
    SaveSystemMessage,
)
from backend.services.webhook.features.messages.send_auto_reply import SendAutoReply

logger = logging.getLogger(__name__)


class RouteTextMessage:
    """Маршрутизирует обычное текстовое сообщение: триггеры + автоответы."""

    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot
        self.fire_event = FireTriggerEventWithSummary(db)

    async def execute(
        self,
        message: Message,
        text_content: str,
        chat_type: str | None,
    ) -> None:
        if text_content.startswith("/"):
            await RouteBotCommand(self.db, self.bot_model, self.telegram_bot).execute(
                message,
                text_content,
                chat_type,
            )
            return

        await self.fire_text_triggers(message, text_content)
        auto_reply = await self.get_auto_reply(message, text_content, chat_type)
        logger.info(
            "Auto-reply lookup: bot_id=%s, text=%s, chat_type=%s, found=%s",
            self.bot_model.id,
            text_content[:50],
            chat_type,
            auto_reply is not None,
        )
        if not auto_reply:
            return

        await SendAutoReply(self.db, self.bot_model, self.telegram_bot).execute(
            message,
            auto_reply,
        )
        if message.chat.type == "private":
            matched = ", ".join(auto_reply.keywords) if auto_reply.keywords else ""
            await SaveSystemMessage(self.db, self.bot_model).execute(
                chat_id=message.chat.id,
                text=f'Сработал автоответ "{matched}"',
            )
        await CreateAutoReplyEvent(self.db, self.bot_model).execute(
            message,
            text_content,
            auto_reply,
        )

    async def fire_text_triggers(self, message: Message, text_content: str) -> None:
        user_id = message.from_user.id if message.from_user else 0
        trigger_summary = await self.fire_event.execute(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.USER_MESSAGE,
            user_id=user_id,
            chat_id=message.chat.id,
            telegram_bot=self.telegram_bot,
            chat_type=message.chat.type if message.chat else None,
            context={
                "text": text_content[:100],
                "message_text": text_content[:500],
                "message_id": message.message_id,
                "username": message.from_user.username if message.from_user else None,
            },
        )
        if trigger_summary.executed_count <= 0:
            return

        if message.chat.type == "private":
            await SaveSystemMessage(self.db, self.bot_model).execute(
                chat_id=message.chat.id,
                text=f"Сработал триггер ({trigger_summary.executed_count})",
            )
        await CreateTextTriggerEvent(self.db, self.bot_model).execute(
            message,
            text_content,
            trigger_summary,
        )

    async def get_auto_reply(
        self,
        message: Message,
        text_content: str,
        chat_type: str | None,
    ):
        channel = await get_channel_by_telegram_id(
            self.db,
            message.chat.id,
            bot_id=self.bot_model.id,
        )
        return await FindAutoReplyByText(self.db).execute(
            self.bot_model.id,
            text_content,
            chat_type=chat_type,
            channel_id=channel.id if channel else None,
            chat_id=message.chat.id,
            user_id=message.from_user.id if message.from_user else None,
        )
