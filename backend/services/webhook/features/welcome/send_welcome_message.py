import logging

from aiogram.types import ChatJoinRequest, Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot.features.welcome.send_welcome import SendWelcome
from backend.services.bot_provider import resolve_by_token

logger = logging.getLogger(__name__)


class SendWelcomeMessage:
    """Отправляет welcome-сообщение новому участнику канала."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.bot_model = bot_model
        self.send_welcome = SendWelcome(db)

    async def to_join_request(self, join_request: ChatJoinRequest) -> None:
        try:
            telegram_bot = resolve_by_token(self.bot_model.token)
            user = join_request.from_user
            message = await self.send_welcome.execute(
                telegram_bot=telegram_bot,
                bot_model=self.bot_model,
                user_id=user.id,
                chat_id=user.id,
                context={
                    "user": {
                        "id": user.id,
                        "first_name": user.first_name or "",
                        "username": user.username,
                        "last_name": getattr(user, "last_name", None) or "",
                    },
                    "bot": {"first_name": self.bot_model.first_name or ""},
                    "chat": {"title": (join_request.chat.title if join_request.chat else "") or ""},
                },
            )
            if message:
                logger.info(
                    "Welcome sent for join request: user=%s, chat=%s",
                    join_request.from_user.id,
                    join_request.chat.id,
                )
        except Exception as exc:
            logger.error("Failed to send join request welcome: %s", exc, exc_info=True)

    async def to_new_member(self, message: Message, user) -> None:
        try:
            telegram_bot = resolve_by_token(self.bot_model.token)
            welcome_type = getattr(self.bot_model, "welcome_type", "group_message")
            if welcome_type == "private_message":
                sent_message = await self.send_welcome.execute(
                    telegram_bot=telegram_bot,
                    bot_model=self.bot_model,
                    user_id=user.id,
                    chat_id=user.id,
                    context=self.get_member_context(message, user),
                )
            else:
                message_thread_id = self.bot_model.welcome_message_thread_id
                if message_thread_id is None:
                    message_thread_id = getattr(message, "message_thread_id", None)

                sent_message = await self.send_welcome.execute(
                    telegram_bot=telegram_bot,
                    bot_model=self.bot_model,
                    user_id=user.id,
                    chat_id=message.chat.id,
                    context=self.get_member_context(message, user),
                    message_thread_id=message_thread_id,
                )

            if sent_message:
                logger.info(
                    "Welcome sent for new member: user=%s, chat=%s, type=%s",
                    user.id,
                    message.chat.id,
                    welcome_type,
                )
        except Exception as exc:
            logger.error("Failed to send new member welcome: %s", exc, exc_info=True)

    def get_member_context(self, message: Message, user) -> dict:
        return {
            "user": {
                "id": user.id,
                "first_name": user.first_name or "",
                "username": getattr(user, "username", None),
                "last_name": getattr(user, "last_name", None) or "",
            },
            "bot": {"first_name": self.bot_model.first_name or ""},
            "chat": {"title": (message.chat.title if message.chat else None) or ""},
        }
