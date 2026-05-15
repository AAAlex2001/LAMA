import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, MessageType
from backend.services.direct.features.messages.save_outgoing_message import (
    SaveOutgoingMessage,
)

logger = logging.getLogger(__name__)


class SaveOutgoingIfDirect:
    """Если сообщение DM от бота — пишет в BotMessage(is_incoming=False)."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(
        self,
        chat_id: int,
        tg_message: Message | None,
        fallback_type: MessageType,
        fallback_media_url: str | None,
    ) -> None:
        if not tg_message or chat_id <= 0:
            return

        try:
            await SaveOutgoingMessage(self.db).execute(
                bot_id=self.bot_model.id,
                tg_chat_id=chat_id,
                tg_message=tg_message,
                fallback_type=fallback_type,
                fallback_media_url=fallback_media_url,
            )
            await self.db.flush()
        except Exception as exc:
            logger.error("Failed to save outgoing bot message: %s", exc, exc_info=True)
