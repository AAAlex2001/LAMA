"""
Обработчик приветственных сообщений для webhook
"""

import logging

from aiogram.types import ChatJoinRequest, Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot import WelcomeService
from backend.services.bot_provider import resolve_by_token

logger = logging.getLogger(__name__)


class WelcomeHandler:
    """Обработчик приветственных сообщений"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.welcome_service = WelcomeService(db)

    async def handle_join_request(self, join_request: ChatJoinRequest) -> None:
        """
        Обработать приветствие при заявке на вступление
        Отправляется в личные сообщения
        """
        try:
            telegram_bot = resolve_by_token(self.bot_model.token)
            message = (
                await self.welcome_service.handle_join_request(
                    telegram_bot=telegram_bot,
                    bot_model=self.bot_model,
                    join_request=join_request,
                )
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
                sent_message = await self.welcome_service.handle_member_joined(
                    telegram_bot=telegram_bot,
                    bot_model=self.bot_model,
                    user_id=new_member_user.id,
                    chat_id=new_member_user.id,
                    user_first_name=new_member_user.first_name,
                    user_username=getattr(new_member_user, "username", None),
                    user_last_name=getattr(new_member_user, "last_name", None),
                    chat_title=(message.chat.title if message.chat else None),
                )
            else:
                message_thread_id = self.bot_model.welcome_message_thread_id
                if message_thread_id is None:
                    message_thread_id = getattr(message, "message_thread_id", None)

                sent_message = await self.welcome_service.handle_member_joined(
                    telegram_bot=telegram_bot,
                    bot_model=self.bot_model,
                    user_id=new_member_user.id,
                    chat_id=message.chat.id,
                    user_first_name=new_member_user.first_name,
                    user_username=getattr(new_member_user, "username", None),
                    user_last_name=getattr(new_member_user, "last_name", None),
                    chat_title=(message.chat.title if message.chat else None),
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
