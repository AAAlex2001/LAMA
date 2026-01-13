"""
Обработчик приветственных сообщений для webhook
"""
import logging

from aiogram.types import ChatJoinRequest, Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot.welcome import WelcomeService
from backend.services.webhook.base import get_bot_session

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
            async with get_bot_session() as telegram_bot:
                message = await self.welcome_service.handle_join_request_welcome(
                    telegram_bot=telegram_bot,
                    bot_model=self.bot_model,
                    join_request=join_request,
                )

                if message:
                    logger.info(
                        f"Welcome sent for join request: user={join_request.from_user.id}, "
                        f"chat={join_request.chat.id}"
                    )

        except Exception as e:
            logger.error(
                f"Failed to send join request welcome: {e}", exc_info=True)

    async def handle_new_member(
        self,
        message: Message,
        new_member_user,
    ) -> None:
        """
        Обработать приветствие нового участника в группе
        Отправляется в группу (может быть в топик)
        """
        try:
            async with get_bot_session() as telegram_bot:
                # Определяем топик:
                # 1. Если в настройках бота указан конкретный топик (welcome_message_thread_id),
                #    то отправляем ВСЕГДА в него (независимо от того, куда добавили участника)
                # 2. Если не указан (None), то отправляем в тот топик, куда добавили участника
                message_thread_id = self.bot_model.welcome_message_thread_id
                if message_thread_id is None:
                    message_thread_id = getattr(
                        message, "message_thread_id", None)

                sent_message = await self.welcome_service.handle_member_joined_welcome(
                    telegram_bot=telegram_bot,
                    bot_model=self.bot_model,
                    user_id=new_member_user.id,
                    chat_id=message.chat.id,
                    user_first_name=new_member_user.first_name,
                    user_username=getattr(new_member_user, "username", None),
                    user_last_name=getattr(new_member_user, "last_name", None),
                    chat_title=message.chat.title if message.chat else None,
                    message_thread_id=message_thread_id,
                )

                if sent_message:
                    logger.info(
                        f"Welcome sent for new member: user={new_member_user.id}, "
                        f"chat={message.chat.id}, thread={message_thread_id}"
                    )

        except Exception as e:
            logger.error(
                f"Failed to send new member welcome: {e}", exc_info=True)
