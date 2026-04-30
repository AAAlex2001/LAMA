import logging

from aiogram.exceptions import TelegramAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, MessageType
from backend.services.direct.features.messages.save_outgoing_message import (
    SaveOutgoingMessage,
)

logger = logging.getLogger(__name__)


class SendManualApprovalNotice:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, telegram_bot, user_id: int, chat_title: str) -> None:
        try:
            tg_message = await telegram_bot.send_message(
                chat_id=user_id,
                text=(
                    f"Ваша заявка на вступление в «{chat_title}» отправлена.\n"
                    "Ожидайте одобрения администратором."
                ),
            )
            if not tg_message:
                return

            await SaveOutgoingMessage(self.db).execute(
                bot_id=self.bot_model.id,
                tg_chat_id=user_id,
                tg_message=tg_message,
                fallback_type=MessageType.TEXT,
                fallback_media_url=None,
            )
            await self.db.flush()
        except TelegramAPIError as exc:
            logger.warning("Failed to send pending message: %s", exc)
