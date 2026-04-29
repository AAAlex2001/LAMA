"""
Обработчик приветственных сообщений для webhook
"""

import logging

from aiogram.types import ChatJoinRequest, Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot.features.welcome.send_welcome import SendWelcome
from backend.services.bot_provider import resolve_by_token

logger = logging.getLogger(__name__)


class WelcomeHandler:
    """Обработчик приветственных сообщений"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.send_welcome = SendWelcome(db)

    async def handle_join_request(self, join_request: ChatJoinRequest) -> None:
        """
        Обработать приветствие при заявке на вступление
        Отправляется в личные сообщения
        """
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
                    f"Welcome sent for join request: "
                    f"user={join_request.from_user.id}, "
                    f"chat={join_request.chat.id}"
                )

        except Exception as e:
            logger.error(
                f"Failed to send join request welcome: {e}", exc_info=True
            )

    async def handle_new_member(
        self,
        message: Message,
        new_member_user,
    ) -> None:
        """
        Обработать приветствие нового участника в группе
        Отправляется в группу (может быть в топик) или в ЛС в зависимости от welcome_type
        """
        try:
            telegram_bot = resolve_by_token(self.bot_model.token)

            welcome_type = getattr(self.bot_model, "welcome_type", "group_message")

            if welcome_type == "private_message":
                sent_message = await self.send_welcome.execute(
                    telegram_bot=telegram_bot,
                    bot_model=self.bot_model,
                    user_id=new_member_user.id,
                    chat_id=new_member_user.id,
                    context=build_member_context(self.bot_model, message, new_member_user),
                )
            else:
                message_thread_id = self.bot_model.welcome_message_thread_id
                if message_thread_id is None:
                    message_thread_id = getattr(message, "message_thread_id", None)

                sent_message = await self.send_welcome.execute(
                    telegram_bot=telegram_bot,
                    bot_model=self.bot_model,
                    user_id=new_member_user.id,
                    chat_id=message.chat.id,
                    context=build_member_context(self.bot_model, message, new_member_user),
                    message_thread_id=message_thread_id,
                )

            if sent_message:
                logger.info(
                    f"Welcome sent for new member: "
                    f"user={new_member_user.id}, "
                    f"chat={message.chat.id}, type={welcome_type}"
                )

        except Exception as e:
            logger.error(
                f"Failed to send new member welcome: {e}", exc_info=True
            )


def build_member_context(bot_model: BotModel, message: Message, user) -> dict:
    """Build shortcode context for welcome member messages."""
    return {
        "user": {
            "id": user.id,
            "first_name": user.first_name or "",
            "username": getattr(user, "username", None),
            "last_name": getattr(user, "last_name", None) or "",
        },
        "bot": {"first_name": bot_model.first_name or ""},
        "chat": {"title": (message.chat.title if message.chat else None) or ""},
    }
