import logging

from aiogram.types import Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotMessage, MessageType
from backend.services.direct.features.messages.resolve_media_url import resolve_media_url
from backend.services.direct.features.utils.media_detectors import extract_incoming_media

logger = logging.getLogger(__name__)


class SaveSystemMessage:
    """Сохраняет системное сообщение (new_chat_member, left, etc.)."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, chat_id: int, text: str) -> None:
        self.db.add(
            BotMessage(
                bot_id=self.bot_model.id,
                telegram_message_id=0,
                chat_id=chat_id,
                user_id=None,
                message_type=MessageType.TEXT,
                text_content=text,
                is_incoming=False,
                is_system=True,
            )
        )
        await self.db.flush()

    async def ensure_telegram_message(self, chat_id: int, message: Message) -> None:
        query = select(BotMessage).where(
            BotMessage.bot_id == self.bot_model.id,
            BotMessage.chat_id == chat_id,
            BotMessage.telegram_message_id == message.message_id,
        )
        if (await self.db.execute(query)).scalar_one_or_none():
            return

        message_type, media_file_id = extract_incoming_media(message)
        self.db.add(
            BotMessage(
                bot_id=self.bot_model.id,
                telegram_message_id=message.message_id,
                chat_id=chat_id,
                user_id=None,
                message_type=message_type,
                text_content=message.text or message.caption,
                media_file_id=media_file_id,
                media_url=await self.get_media_url(media_file_id),
                is_incoming=True,
                is_system=True,
                raw_data=message.model_dump(),
            )
        )
        await self.db.flush()

    async def get_media_url(self, media_file_id: str | None) -> str | None:
        if not media_file_id:
            return None
        try:
            return await resolve_media_url(self.bot_model.token, media_file_id)
        except Exception as exc:
            logger.debug("Failed to resolve system message media URL: %s", exc)
            return None
