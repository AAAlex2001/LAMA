import logging

from aiogram.types import CallbackQuery, Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.webhook.features.welcome.send_welcome_message import SendWelcomeMessage

logger = logging.getLogger(__name__)


class SendCaptchaWelcome:
    """Welcome-сообщение после прохождения капчи."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, callback_query: CallbackQuery) -> None:
        if not callback_query.message:
            return

        fake_message = Message(
            message_id=0,
            date=callback_query.message.date,
            chat=callback_query.message.chat,
        )
        try:
            await SendWelcomeMessage(self.db, self.bot_model).to_new_member(
                fake_message,
                callback_query.from_user,
            )
        except Exception as exc:
            logger.error("Failed to send welcome message: %s", exc)
